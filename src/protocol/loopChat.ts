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
import { getLoopConfigDescription, getLoopConfigLabel, getOutputLanguageInstruction, type Locale } from '../i18n';
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

function buildPlanMessage(cycle: LoopCycle, config: CentaurLoopConfig, locale: Locale): LoopMessage[] {
  const plan = cycle.plan;
  if (!plan) return [aiMsg(locale === 'zh-CN' ? '规划完成，但未生成计划详情。' : 'Planning finished, but no plan details were generated.')];

  const taskList = cycle.tasks.map((t, i) => `${i + 1}. ${t.appName}`).join('\n');
  const keywordStr = plan.keywords?.length
    ? locale === 'zh-CN' ? `\n关键词：${plan.keywords.join('、')}` : `\nKeywords: ${plan.keywords.join(', ')}`
    : '';
  const platformStr = plan.platforms.length
    ? locale === 'zh-CN' ? `\n平台：${plan.platforms.join('、')}` : `\nPlatforms: ${plan.platforms.join(', ')}`
    : '';

  void config;
  const text = locale === 'zh-CN'
    ? `📋 本周内容增长计划已出：\n\n${plan.summary}${platformStr}${keywordStr}\n\n${taskList}\n\n确认这个计划吗？或者告诉我要怎么调整。`
    : `📋 The content growth plan is ready:\n\n${plan.summary}${platformStr}${keywordStr}\n\n${taskList}\n\nApprove this plan, or tell me what to change.`;

  const actions: QuickAction[] = [
    { id: 'confirm', label: locale === 'zh-CN' ? '确认，开始生成' : 'Approve and generate', variant: 'primary', action: { type: 'confirm' } },
    { id: 'skip', label: locale === 'zh-CN' ? '跳过本轮' : 'Skip cycle', variant: 'ghost', action: { type: 'skip' } },
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

function buildDraftMessages(cycle: LoopCycle, locale: Locale): LoopMessage[] {
  const messages: LoopMessage[] = [];

  messages.push(aiMsg(locale === 'zh-CN'
    ? `✍️ ${cycle.tasks.length} 篇内容已生成，逐篇给你看：`
    : `✍️ ${cycle.tasks.length} draft(s) are ready for review.`));

  for (const task of cycle.tasks) {
    if (!task.draft) continue;
    const actions: QuickAction[] = [
      { id: `approve-${task.id}`, label: locale === 'zh-CN' ? '通过' : 'Approve', variant: 'primary', action: { type: 'confirm', payload: { taskId: task.id } } },
      { id: `reject-${task.id}`, label: locale === 'zh-CN' ? '修改意见' : 'Change request', variant: 'ghost', action: { type: 'reject', payload: { taskId: task.id } } },
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

  messages.push(aiMsg(locale === 'zh-CN' ? '全部看完了，可以逐篇确认，也可以说"全部通过"。' : 'You can approve drafts one by one, or approve all of them.', 'quick_actions', {
    actions: [
      { id: 'approve-all', label: locale === 'zh-CN' ? '全部通过' : 'Approve all', variant: 'primary', action: { type: 'approve_all' } },
    ],
  }));

  return messages;
}

function buildPublishMessage(cycle: LoopCycle, locale: Locale): LoopMessage[] {
  const confirmed = cycle.tasks.filter((t) => t.status === 'confirmed');
  const messages: LoopMessage[] = [];

  messages.push(aiMsg(
    locale === 'zh-CN'
      ? `📤 ${confirmed.length} 篇内容已确认，请复制到目标平台发布。发完了告诉我一声。`
      : `📤 ${confirmed.length} item(s) are approved. Publish them to the target channel, then tell me when they are live.`,
    'publish_card',
    {
      actions: [
        { id: 'published-all', label: locale === 'zh-CN' ? '已全部发布' : 'Mark all published', variant: 'primary', action: { type: 'mark_published' } },
        { id: 'skip-publish', label: locale === 'zh-CN' ? '稍后发布' : 'Later', variant: 'ghost', action: { type: 'skip' } },
      ],
      cycleId: cycle.id,
    },
  ));

  return messages;
}

function buildFeedbackRequest(cycle: LoopCycle, config: CentaurLoopConfig, locale: Locale): LoopMessage[] {
  void cycle;
  void config;
  const text = locale === 'zh-CN'
    ? '📊 内容发布后表现怎么样？可以直接说数据（比如"公众号800阅读56赞"），或者截个图。'
    : '📊 How did it perform after publishing? Send metrics like "1200 views 68 likes", or paste the result manually.';

  return [aiMsg(text, 'feedback_request', {
    actions: [
      { id: 'skip-feedback', label: locale === 'zh-CN' ? '跳过，直接复盘' : 'Skip and review', variant: 'ghost', action: { type: 'skip' } },
    ],
    cycleId: cycle.id,
  })];
}

function buildReviewMessage(cycle: LoopCycle, locale: Locale): LoopMessage[] {
  const review = cycle.review;
  if (!review) return [aiMsg(locale === 'zh-CN' ? '复盘完成。' : 'Review complete.')];

  const effective = review.effectivePoints.map((p) => `  ✅ ${p}`).join('\n');
  const ineffective = review.ineffectivePoints.map((p) => `  ⚠️ ${p}`).join('\n');
  const data = review.dataHighlights.map((d) => `  📈 ${d}`).join('\n');

  const text = locale === 'zh-CN'
    ? `📋 **本轮复盘**\n\n${review.summary}\n\n${effective ? `有效：\n${effective}\n\n` : ''}${ineffective ? `待改进：\n${ineffective}\n\n` : ''}${data ? `数据：\n${data}` : ''}`
    : `📋 **Cycle review**\n\n${review.summary}\n\n${effective ? `What worked:\n${effective}\n\n` : ''}${ineffective ? `Needs improvement:\n${ineffective}\n\n` : ''}${data ? `Data:\n${data}` : ''}`;

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
      locale === 'zh-CN'
        ? `从这轮复盘中提炼了几条经验：\n\n${memList}\n\n要记住这些吗？`
        : `I extracted a few memory candidates from this cycle:\n\n${memList}\n\nShould these become long-term memory?`,
      'memory_card',
      {
        memories: cycle.memoryCandidates
          .filter((m) => m.status === 'pending')
          .map((m) => ({ id: m.id, content: m.content, category: m.category })),
        actions: [
          { id: 'confirm-all-mem', label: locale === 'zh-CN' ? '全部记住' : 'Save all', variant: 'primary', action: { type: 'confirm' } },
          { id: 'skip-mem', label: locale === 'zh-CN' ? '不用了' : 'Do not save', variant: 'ghost', action: { type: 'skip' } },
        ],
        cycleId: cycle.id,
      },
    ));
  }

  return messages;
}

function buildCompleteMessage(cycle: LoopCycle, config: CentaurLoopConfig, locale: Locale): LoopMessage[] {
  const suggestion = cycle.nextSuggestion
    ? locale === 'zh-CN' ? `\n\n💡 下一轮建议：${cycle.nextSuggestion}` : `\n\n💡 Next-cycle suggestion: ${cycle.nextSuggestion}`
    : '';

  return [aiMsg(
    locale === 'zh-CN'
      ? `🎉 ${getLoopConfigLabel(config.id, locale)}第 ${cycle.cycleNumber} 轮完成！${suggestion}\n\n想开始下一轮的话，直接告诉我目标就行。`
      : `🎉 ${getLoopConfigLabel(config.id, locale)} cycle #${cycle.cycleNumber} is complete.${suggestion}\n\nTell me the next goal when you want to run another cycle.`,
    'cycle_complete',
    {
      actions: [
        { id: 'next-cycle', label: locale === 'zh-CN' ? '开始下一轮' : 'Start next cycle', variant: 'primary', action: { type: 'start_loop' } },
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
  private locale: Locale;

  constructor(
    config: CentaurLoopConfig,
    onUpdate: (session: LoopChatSession) => void,
    locale: Locale = 'zh-CN',
  ) {
    this.config = config;
    this.onUpdate = onUpdate;
    this.locale = locale;
    this.session = {
      id: `chat-${Date.now().toString(36)}`,
      loopConfigId: config.id,
      cycleId: null,
      messages: [
        aiMsg(
          locale === 'zh-CN'
            ? `👋 我是你的${getLoopConfigLabel(config.id, locale)}助手。\n\n${getLoopConfigDescription(config.id, locale)}\n\n告诉我这周的内容增长目标，我来帮你启动闭环。`
            : `👋 I am your ${getLoopConfigLabel(config.id, locale)} assistant.\n\n${getLoopConfigDescription(config.id, locale)}\n\nTell me the content growth goal for this week, and I will start the loop.`,
          'text',
          {
            actions: [
              {
                id: 'start-seo',
                label: locale === 'zh-CN' ? '帮我做本周增长' : 'Plan this week\'s growth loop',
                variant: 'primary',
                action: {
                  type: 'start_loop',
                  payload: {
                    goal: locale === 'zh-CN'
                      ? '这周帮我做一轮 SEO/GEO 内容增长'
                      : 'Run a content growth loop about AI agent feedback loops this week',
                  },
                },
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
      outputLanguage: getOutputLanguageInstruction(this.locale),
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
          this.pushMessages([aiMsg(this.locale === 'zh-CN' ? '✅ 已确认。' : '✅ Approved.')]);

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
        this.pushMessages([aiMsg(this.locale === 'zh-CN' ? '✅ 全部通过！' : '✅ All drafts approved.')]);
        await this.advanceAndTranslate();
        return;
      }

      case 'reject':
      case 'modify': {
        if (!cycle) return;
        const note = action.payload?.note ?? (this.locale === 'zh-CN' ? '需要修改' : 'Needs changes');
        this.pushMessages([aiMsg(this.locale === 'zh-CN'
          ? `收到，我记下了你的意见：「${note}」\n\n目前先继续推进，下一轮会结合这个反馈优化。`
          : `Got it. I recorded your change request: "${note}".\n\nFor this MVP I will continue the loop and use this as improvement context.`)]);

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
        this.pushMessages([aiMsg(this.locale === 'zh-CN' ? '👍 已标记发布。' : '👍 Marked as published.')]);
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
        this.pushMessages([aiMsg(this.locale === 'zh-CN' ? '📊 收到反馈数据，开始复盘分析…' : '📊 Feedback received. Starting review...')]);
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
    this.pushMessages([aiMsg(this.locale === 'zh-CN'
      ? `🚀 收到！目标：「${goal}」\n\n正在规划…`
      : `🚀 Got it. Goal: "${goal}"\n\nPlanning now...`, 'progress', { progressStage: 'planning' })]);
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
      this.pushMessages([aiMsg(this.locale === 'zh-CN' ? `❌ 出了点问题：${msg}` : `❌ Something went wrong: ${msg}`)]);
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
        return buildPlanMessage(cycle, this.config, this.locale);
      case 'awaiting_review':
        return buildDraftMessages(cycle, this.locale);
      case 'awaiting_publish':
        return buildPublishMessage(cycle, this.locale);
      case 'awaiting_feedback':
        return buildFeedbackRequest(cycle, this.config, this.locale);
      case 'awaiting_memory':
        return buildReviewMessage(cycle, this.locale);
      case 'cycle_complete':
        return [...buildReviewMessage(cycle, this.locale), ...buildCompleteMessage(cycle, this.config, this.locale)];
      case 'planning':
      case 'generating':
      case 'reviewing_auto':
        return [aiMsg(this.locale === 'zh-CN' ? '⏳ AI 正在工作…' : '⏳ AI is working...', 'progress', { progressStage: cycle.stage })];
      default:
        return [];
    }
  }
}
