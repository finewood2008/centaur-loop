/**
 * Loop Chat Controller — 对话驱动闭环的核心控制器
 *
 * 职责：
 * 1. 把 loopEngine 的阶段推进翻译成对话消息
 * 2. 把用户的文字/点击翻译成 loopEngine 的动作
 * 3. 管理对话消息列表
 */

import { useLoopStore } from '../core/loopStore';
import { advanceLoop } from '../core/loopEngine';
import { submitQuickFeedback } from '../core/feedbackCollector';
import type { CentaurLoopConfig, LoopCycle, SpiritBubblePayload } from '../core/types';
import type {
  LoopChatSession,
  LoopMessage,
  LoopMessageMetadata,
  QuickAction,
  UserAction,
} from './types';

// ─── 工具函数 ────────────────────────────────────────────────

function msgId(): string {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function now(): string {
  return new Date().toISOString();
}

function aiMsg(text: string, type: LoopMessage['type'] = 'text', metadata?: LoopMessageMetadata): LoopMessage {
  return { id: msgId(), role: 'ai', type, text, timestamp: now(), metadata };
}

function systemMsg(text: string): LoopMessage {
  return { id: msgId(), role: 'system', type: 'text', text, timestamp: now() };
}

function humanMsg(text: string): LoopMessage {
  return { id: msgId(), role: 'human', type: 'text', text, timestamp: now() };
}

// ─── 意图解析器 ──────────────────────────────────────────────

const CONFIRM_PATTERNS = /^(行|好|确认|通过|ok|可以|没问题|approve|yes|同意|对|嗯|去吧|开始|继续)/i;
const REJECT_PATTERNS = /^(不行|退回|重做|reject|修改|改一下|不好|差|换)/i;
const SKIP_PATTERNS = /^(跳过|skip|算了|不用了|下一步)/i;
const PUBLISH_PATTERNS = /(已发布|发了|已经发|published)/i;
const FEEDBACK_PATTERNS = /(\d+)\s*(阅读|播放|views?|点赞|likes?|收藏|评论)/i;

export function parseUserIntent(text: string, currentStage: string): UserAction {
  const trimmed = text.trim();

  if (CONFIRM_PATTERNS.test(trimmed)) {
    return { type: 'confirm' };
  }
  if (SKIP_PATTERNS.test(trimmed)) {
    return { type: 'skip' };
  }
  if (PUBLISH_PATTERNS.test(trimmed)) {
    return { type: 'mark_published', payload: { text: trimmed } };
  }
  if (REJECT_PATTERNS.test(trimmed)) {
    return { type: 'reject', payload: { note: trimmed } };
  }

  // 尝试提取反馈数据
  if (currentStage === 'awaiting_feedback' && FEEDBACK_PATTERNS.test(trimmed)) {
    const numbers = trimmed.match(/\d+/g)?.map(Number) ?? [];
    return {
      type: 'submit_feedback',
      payload: {
        feedback: {
          views: numbers[0],
          likes: numbers[1],
        },
        note: trimmed,
      },
    };
  }

  // 默认当自由文本处理（可能是修改指令）
  return {
    type: currentStage.startsWith('awaiting_') ? 'modify' : 'free_text',
    payload: { text: trimmed, note: trimmed },
  };
}

// ─── 阶段 → 消息翻译器 ──────────────────────────────────────

function buildPlanMessage(cycle: LoopCycle, config: CentaurLoopConfig): LoopMessage[] {
  const plan = cycle.plan;
  if (!plan) return [aiMsg('规划完成，但未生成计划详情。')];

  const taskList = cycle.tasks.map((t, i) => `${i + 1}. ${t.appName}`).join('\n');
  const keywordStr = plan.keywords?.length ? `\n关键词：${plan.keywords.join('、')}` : '';
  const platformStr = plan.platforms.length ? `\n平台：${plan.platforms.join('、')}` : '';

  const text = `📋 ${config.cyclePeriod === 'daily' ? '今日' : '本周'}计划已出：\n\n${plan.summary}${platformStr}${keywordStr}\n\n${taskList}\n\n确认这个计划吗？或者告诉我要怎么调整。`;

  const actions: QuickAction[] = [
    { id: 'confirm', label: '确认，开始生成', variant: 'primary', action: { type: 'confirm' } },
    { id: 'skip', label: '跳过本轮', variant: 'ghost', action: { type: 'skip' } },
  ];

  return [aiMsg(text, 'plan_card', {
    plan: {
      summary: plan.summary,
      platforms: plan.platforms,
      keywords: plan.keywords,
      tasks: cycle.tasks.map((t) => ({ appName: t.appName, artifactType: t.artifactType })),
    },
    actions,
    cycleId: cycle.id,
  })];
}

function buildDraftMessages(cycle: LoopCycle): LoopMessage[] {
  const messages: LoopMessage[] = [];

  messages.push(aiMsg(`✍️ ${cycle.tasks.length} 篇内容已生成，逐篇给你看：`));

  for (const task of cycle.tasks) {
    if (!task.draft) continue;
    const actions: QuickAction[] = [
      { id: `approve-${task.id}`, label: '通过', variant: 'primary', action: { type: 'confirm', payload: { taskId: task.id } } },
      { id: `reject-${task.id}`, label: '修改意见', variant: 'ghost', action: { type: 'reject', payload: { taskId: task.id } } },
    ];

    messages.push(aiMsg(
      `**${task.draft.title}**\n_${task.appName}_\n\n${task.draft.preview}`,
      'draft_card',
      {
        draft: {
          taskId: task.id,
          title: task.draft.title,
          content: task.draft.content,
          appName: task.appName,
          artifactType: task.artifactType,
        },
        actions,
        cycleId: cycle.id,
      },
    ));
  }

  messages.push(aiMsg('全部看完了，可以逐篇确认，也可以说"全部通过"。', 'quick_actions', {
    actions: [
      { id: 'approve-all', label: '全部通过', variant: 'primary', action: { type: 'approve_all' } },
    ],
  }));

  return messages;
}

function buildPublishMessage(cycle: LoopCycle): LoopMessage[] {
  const confirmed = cycle.tasks.filter((t) => t.status === 'confirmed');
  const messages: LoopMessage[] = [];

  messages.push(aiMsg(
    `📤 ${confirmed.length} 篇内容已确认，请复制到目标平台发布。发完了告诉我一声。`,
    'publish_card',
    {
      actions: [
        { id: 'published-all', label: '已全部发布', variant: 'primary', action: { type: 'mark_published' } },
        { id: 'skip-publish', label: '稍后发布', variant: 'ghost', action: { type: 'skip' } },
      ],
      cycleId: cycle.id,
    },
  ));

  return messages;
}

function buildFeedbackRequest(cycle: LoopCycle, config: CentaurLoopConfig): LoopMessage[] {
  const text = config.cyclePeriod === 'daily'
    ? '📊 视频发了多久了？有数据了的话告诉我播放量、点赞这些。也可以直接截图给我。'
    : '📊 内容发布后表现怎么样？可以直接说数据（比如"公众号800阅读56赞"），或者截个图。';

  return [aiMsg(text, 'feedback_request', {
    actions: [
      { id: 'skip-feedback', label: '跳过，直接复盘', variant: 'ghost', action: { type: 'skip' } },
    ],
    cycleId: cycle.id,
  })];
}

function buildReviewMessage(cycle: LoopCycle): LoopMessage[] {
  const review = cycle.review;
  if (!review) return [aiMsg('复盘完成。')];

  const effective = review.effectivePoints.map((p) => `  ✅ ${p}`).join('\n');
  const ineffective = review.ineffectivePoints.map((p) => `  ⚠️ ${p}`).join('\n');
  const data = review.dataHighlights.map((d) => `  📈 ${d}`).join('\n');

  const text = `📋 **本轮复盘**\n\n${review.summary}\n\n${effective ? `有效：\n${effective}\n\n` : ''}${ineffective ? `待改进：\n${ineffective}\n\n` : ''}${data ? `数据：\n${data}` : ''}`;

  const messages: LoopMessage[] = [
    aiMsg(text, 'review_card', {
      review: {
        summary: review.summary,
        effectivePoints: review.effectivePoints,
        ineffectivePoints: review.ineffectivePoints,
        dataHighlights: review.dataHighlights,
        nextSuggestion: cycle.nextSuggestion ?? '',
      },
      cycleId: cycle.id,
    }),
  ];

  if (cycle.memoryCandidates.length > 0) {
    const memList = cycle.memoryCandidates
      .filter((m) => m.status === 'pending')
      .map((m) => `  💡 ${m.content}`)
      .join('\n');

    messages.push(aiMsg(
      `从这轮复盘中提炼了几条经验：\n\n${memList}\n\n要记住这些吗？`,
      'memory_card',
      {
        memories: cycle.memoryCandidates
          .filter((m) => m.status === 'pending')
          .map((m) => ({ id: m.id, content: m.content, category: m.category })),
        actions: [
          { id: 'confirm-all-mem', label: '全部记住', variant: 'primary', action: { type: 'confirm' } },
          { id: 'skip-mem', label: '不用了', variant: 'ghost', action: { type: 'skip' } },
        ],
        cycleId: cycle.id,
      },
    ));
  }

  return messages;
}

function buildCompleteMessage(cycle: LoopCycle, config: CentaurLoopConfig): LoopMessage[] {
  const suggestion = cycle.nextSuggestion
    ? `\n\n💡 下一轮建议：${cycle.nextSuggestion}`
    : '';

  return [aiMsg(
    `🎉 ${config.name}第 ${cycle.cycleNumber} 轮完成！${suggestion}\n\n想开始下一轮的话，直接告诉我目标就行。`,
    'cycle_complete',
    {
      actions: [
        { id: 'next-cycle', label: '开始下一轮', variant: 'primary', action: { type: 'start_loop' } },
      ],
      cycleId: cycle.id,
    },
  )];
}

// ─── 主控制器 ────────────────────────────────────────────────

export class LoopChatController {
  private session: LoopChatSession;
  private config: CentaurLoopConfig;
  private onUpdate: (session: LoopChatSession) => void;

  constructor(
    config: CentaurLoopConfig,
    onUpdate: (session: LoopChatSession) => void,
  ) {
    this.config = config;
    this.onUpdate = onUpdate;
    this.session = {
      id: `chat-${Date.now().toString(36)}`,
      loopConfigId: config.id,
      cycleId: null,
      messages: [
        aiMsg(
          `👋 我是你的${config.name}助手。\n\n${config.description}\n\n告诉我${config.cyclePeriod === 'daily' ? '今天' : '这周'}的目标，我来帮你启动闭环。`,
          'text',
          {
            actions: [
              {
                id: 'start-seo',
                label: config.cyclePeriod === 'daily' ? '帮我做今日选题' : '帮我做本周增长',
                variant: 'primary',
                action: { type: 'start_loop', payload: { goal: config.cyclePeriod === 'daily' ? '今天帮我出一条有策略的短视频' : '这周帮我做一轮SEO增长' } },
              },
            ],
          },
        ),
      ],
      status: 'idle',
    };
  }

  getSession(): LoopChatSession {
    return this.session;
  }

  private pushMessages(msgs: LoopMessage[]): void {
    this.session = {
      ...this.session,
      messages: [...this.session.messages, ...msgs],
    };
    this.onUpdate(this.session);
  }

  private setStatus(status: LoopChatSession['status']): void {
    this.session = { ...this.session, status };
    this.onUpdate(this.session);
  }

  private noop(_b: SpiritBubblePayload): void { /* no-op */ }

  private get advanceContext() {
    return {
      connected: true,
      ownerContext: '',
      businessContext: '',
      pushBubble: this.noop,
    };
  }

  private getCycle(): LoopCycle | null {
    if (!this.session.cycleId) return null;
    return useLoopStore.getState().cycles[this.session.cycleId] ?? null;
  }

  // ── 处理用户输入 ──────────────────────────────────────────

  async handleUserInput(text: string): Promise<void> {
    // 添加用户消息
    this.pushMessages([humanMsg(text)]);

    const cycle = this.getCycle();
    const currentStage = cycle?.stage ?? 'idle';

    // 如果没有活跃循环，当作启动指令
    if (!cycle || currentStage === 'cycle_complete') {
      await this.startCycle(text);
      return;
    }

    const intent = parseUserIntent(text, currentStage);
    await this.handleAction(intent);
  }

  // ── 处理快捷按钮动作 ──────────────────────────────────────

  async handleAction(action: UserAction): Promise<void> {
    const store = useLoopStore.getState();
    const cycle = this.getCycle();

    switch (action.type) {
      case 'start_loop': {
        const goal = action.payload?.goal ?? action.payload?.text ?? '';
        if (goal) await this.startCycle(goal);
        return;
      }

      case 'confirm': {
        if (!cycle) return;

        if (action.payload?.taskId) {
          // 确认单篇草稿
          store.updateTask(cycle.id, action.payload.taskId, {
            status: 'confirmed',
            confirmation: { status: 'approved', confirmedAt: now() },
          });
          this.pushMessages([aiMsg('✅ 已确认。')]);

          // 检查是否全部审完
          const fresh = useLoopStore.getState().cycles[cycle.id];
          if (fresh && fresh.tasks.every((t) => t.status === 'confirmed' || t.status === 'rejected')) {
            await this.advanceAndTranslate();
          }
          return;
        }

        // 通用确认（计划/记忆等）
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'approve_all': {
        if (!cycle) return;
        for (const task of cycle.tasks) {
          if (task.status === 'draft_ready') {
            store.updateTask(cycle.id, task.id, {
              status: 'confirmed',
              confirmation: { status: 'approved', confirmedAt: now() },
            });
          }
        }
        this.pushMessages([aiMsg('✅ 全部通过！')]);
        await this.advanceAndTranslate();
        return;
      }

      case 'reject':
      case 'modify': {
        if (!cycle) return;
        const note = action.payload?.note ?? '需要修改';
        this.pushMessages([aiMsg(`收到，我记下了你的意见：「${note}」\n\n目前先继续推进，下一轮会结合这个反馈优化。`)]);

        // 暂时按确认处理，后续接入重新生成
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'mark_published': {
        if (!cycle) return;
        for (const task of cycle.tasks) {
          if (task.status === 'confirmed' && !task.publish?.published) {
            store.updateTask(cycle.id, task.id, {
              status: 'published',
              publish: { published: true, publishedAt: now() },
            });
          }
        }
        this.pushMessages([aiMsg('👍 已标记发布。')]);
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'submit_feedback': {
        if (!cycle) return;
        const fb = action.payload?.feedback;
        if (fb) {
          const task = cycle.tasks.find((t) => t.status === 'published' || t.status === 'confirmed');
          if (task) {
            const feedback = submitQuickFeedback(task.id, cycle.id, {
              published: true,
              views: fb.views,
              likes: fb.likes,
              rating: fb.rating,
              ownerNote: fb.note,
            });
            store.updateTask(cycle.id, task.id, { feedback, status: 'feedback_done' });
          }
        }
        this.pushMessages([aiMsg('📊 收到反馈数据，开始复盘分析…')]);
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'skip': {
        if (!cycle) return;
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'free_text': {
        // 当做修改意见处理
        await this.handleAction({ type: 'modify', payload: action.payload });
        return;
      }
    }
  }

  // ── 启动循环 ──────────────────────────────────────────────

  private async startCycle(goal: string): Promise<void> {
    const store = useLoopStore.getState();
    this.pushMessages([aiMsg(`🚀 收到！目标：「${goal}」\n\n正在规划…`, 'progress', { progressStage: 'planning' })]);
    this.setStatus('running');

    const cycleId = store.startCycle(this.config.id, goal, 'manual');
    this.session = { ...this.session, cycleId };

    await this.advanceAndTranslate();
  }

  // ── 推进并翻译 ────────────────────────────────────────────

  private async advanceAndTranslate(): Promise<void> {
    if (!this.session.cycleId) return;

    this.setStatus('running');

    try {
      await advanceLoop(this.session.cycleId, this.advanceContext);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.pushMessages([aiMsg(`❌ 出了点问题：${msg}`)]);
      this.setStatus('waiting_human');
      return;
    }

    // 读取最新状态，翻译成消息
    const cycle = this.getCycle();
    if (!cycle) return;

    const messages = this.translateStage(cycle);
    this.pushMessages(messages);

    const isWaiting = cycle.stage.startsWith('awaiting_');
    const isComplete = cycle.stage === 'cycle_complete';
    this.setStatus(isComplete ? 'complete' : isWaiting ? 'waiting_human' : 'running');
  }

  private translateStage(cycle: LoopCycle): LoopMessage[] {
    switch (cycle.stage) {
      case 'awaiting_plan_review':
        return buildPlanMessage(cycle, this.config);
      case 'awaiting_review':
        return buildDraftMessages(cycle);
      case 'awaiting_publish':
        return buildPublishMessage(cycle);
      case 'awaiting_feedback':
        return buildFeedbackRequest(cycle, this.config);
      case 'awaiting_memory':
        return buildReviewMessage(cycle);
      case 'cycle_complete':
        return [...buildReviewMessage(cycle), ...buildCompleteMessage(cycle, this.config)];
      case 'planning':
      case 'generating':
      case 'reviewing_auto':
        return [aiMsg('⏳ AI 正在工作…', 'progress', { progressStage: cycle.stage })];
      default:
        return [];
    }
  }
}
