import { useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, Copy, Loader2, Plus,
  RefreshCw, Send, Sparkles,
} from 'lucide-react';
import type { CentaurLoopConfig, LoopCycle, QuickFeedbackInput } from '../core/types';
import LoopDraftCard from './LoopDraftCard';
import LoopMemoryPanel from './LoopMemoryPanel';
import LoopHistoryTimeline from './LoopHistoryTimeline';

interface LoopWorkspaceMainProps {
  cycle: LoopCycle | null;
  config: CentaurLoopConfig;
  history: LoopCycle[];
  advancing: boolean;
  onStartCycle: (goal: string) => void;
  onConfirmPlan: () => void;
  onApproveDraft: (taskId: string) => void;
  onRejectDraft: (taskId: string, note: string) => void;
  onConfirmAllDrafts: () => void;
  onMarkPublished: (taskId: string, platform: string) => void;
  onMarkAllPublished: () => void;
  onSubmitQuickFeedback: (taskId: string, data: QuickFeedbackInput) => void;
  onSubmitAllFeedback: () => void;
  onConfirmMemory: (candidateId: string) => void;
  onRejectMemory: (candidateId: string) => void;
  onConfirmAllMemory: () => void;
  onAdvance: () => void;
}

export default function LoopWorkspaceMain({
  cycle, config, history, advancing,
  onStartCycle, onConfirmPlan, onApproveDraft, onRejectDraft, onConfirmAllDrafts,
  onMarkPublished, onMarkAllPublished, onSubmitAllFeedback,
  onConfirmMemory, onRejectMemory, onConfirmAllMemory, onAdvance,
}: LoopWorkspaceMainProps) {
  const [goalDraft, setGoalDraft] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  // 无活跃循环 / 已完成
  if (!cycle || cycle.stage === 'cycle_complete') {
    return (
      <div className="space-y-6">
        {cycle?.stage === 'cycle_complete' && cycle.review && (
          <section className="card-glass-warm p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-sage-green" />
              <h3 className="text-sm font-semibold text-near-black">第 {cycle.cycleNumber} 轮完成</h3>
            </div>
            <p className="text-sm text-olive-gray">{cycle.review.summary}</p>
            {cycle.review.effectivePoints.length > 0 && (
              <div className="mt-3">
                <p className="text-label text-sage-green">有效点</p>
                <ul className="mt-1 space-y-1">
                  {cycle.review.effectivePoints.map((p, i) => (
                    <li key={i} className="text-sm text-olive-gray">{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {cycle.nextSuggestion && (
              <div className="mt-3 rounded-xl border border-terracotta/15 bg-terracotta/5 p-3">
                <p className="text-label text-terracotta">下一轮建议</p>
                <p className="mt-1 text-sm text-near-black">{cycle.nextSuggestion}</p>
              </div>
            )}
          </section>
        )}

        <section className="card-glass p-5">
          <h3 className="text-sm font-semibold text-near-black mb-3">
            {cycle?.stage === 'cycle_complete' ? '开始新一轮' : `启动${config.name}`}
          </h3>
          <textarea value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)}
            placeholder={config.cyclePeriod === 'daily'
              ? '例如：今天拍一条关于本地部署 AI 优势的短视频'
              : '例如：这周围绕"本地AI员工"写 3 篇公众号 + 2 条小红书'}
            rows={3}
            className="w-full resize-none rounded-xl border border-border-cream bg-ivory px-4 py-3 text-sm text-near-black outline-none focus:border-terracotta/40" />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-stone-gray">
              {config.cyclePeriod === 'daily' ? '日循环' : '周循环'} · {config.trigger.description}
            </p>
            <button type="button" disabled={!goalDraft.trim() || advancing}
              onClick={() => { onStartCycle(goalDraft.trim()); setGoalDraft(''); }}
              className="btn-terracotta text-sm disabled:opacity-40">
              {advancing
                ? <><Loader2 size={14} className="animate-spin" /> 规划中…</>
                : <><Sparkles size={14} /> 开始闭环</>}
            </button>
          </div>
        </section>

        {history.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-near-black mb-3">历史循环</h3>
            <LoopHistoryTimeline history={history} />
          </section>
        )}
      </div>
    );
  }

  // AI 自动阶段
  if (cycle.stage === 'planning' || cycle.stage === 'generating' || cycle.stage === 'reviewing_auto') {
    const labels: Record<string, string> = {
      planning: '正在规划任务…', generating: '正在生成草稿…', reviewing_auto: '正在自动复盘…',
    };
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 size={32} className="animate-spin text-terracotta" />
        <p className="text-sm font-medium text-near-black">{labels[cycle.stage]}</p>
        <p className="text-xs text-olive-gray">AI 正在工作，完成后会自动通知你</p>
      </div>
    );
  }

  // awaiting_plan_review
  if (cycle.stage === 'awaiting_plan_review' && cycle.plan) {
    return (
      <section className="space-y-4">
        <div className="card-glass p-5">
          <h3 className="text-sm font-semibold text-near-black mb-3">
            {config.cyclePeriod === 'daily' ? '今日' : '本周'}计划
          </h3>
          <p className="text-sm text-olive-gray">{cycle.plan.summary}</p>
          {cycle.plan.platforms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cycle.plan.platforms.map((p) => <span key={p} className="badge">{p}</span>)}
            </div>
          )}
          {cycle.plan.keywords && cycle.plan.keywords.length > 0 && (
            <div className="mt-3">
              <p className="text-label">目标关键词</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {cycle.plan.keywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-warm-sand/60 px-2.5 py-0.5 text-xs text-olive-gray">{kw}</span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3">
            <p className="text-label">任务列表（{cycle.tasks.length} 项）</p>
            <ul className="mt-2 space-y-1.5">
              {cycle.tasks.map((task, i) => (
                <li key={task.id} className="flex items-center gap-2 text-sm text-near-black">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warm-sand text-xs">{i + 1}</span>
                  {task.appName}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onConfirmPlan} className="btn-terracotta" disabled={advancing}>
            {advancing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            确认计划，开始生成
          </button>
        </div>
      </section>
    );
  }

  // awaiting_review
  if (cycle.stage === 'awaiting_review') {
    const allReviewed = cycle.tasks.every((t) => t.status === 'confirmed' || t.status === 'rejected');
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-near-black">
            审核草稿（{cycle.tasks.filter((t) => t.status === 'confirmed').length}/{cycle.tasks.length}）
          </h3>
          {!allReviewed && (
            <button type="button" onClick={onConfirmAllDrafts} className="btn-ghost text-xs"><Check size={13} /> 全部确认</button>
          )}
        </div>
        <div className="space-y-3">
          {cycle.tasks.map((task) => (
            <LoopDraftCard key={task.id} task={task}
              onApprove={() => onApproveDraft(task.id)}
              onReject={(note) => onRejectDraft(task.id, note)}
              onViewFull={() => {}} />
          ))}
        </div>
        {allReviewed && (
          <button type="button" onClick={onAdvance} className="btn-terracotta" disabled={advancing}>
            {advancing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            进入发布阶段
          </button>
        )}
      </section>
    );
  }

  // awaiting_publish
  if (cycle.stage === 'awaiting_publish') {
    const confirmedTasks = cycle.tasks.filter((t) => t.status === 'confirmed');
    const allPublished = confirmedTasks.every((t) => t.publish?.published);
    return (
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-near-black">发布内容</h3>
        <p className="text-sm text-olive-gray">请将确认的内容复制到目标平台发布</p>
        <div className="space-y-3">
          {confirmedTasks.map((task) => (
            <div key={task.id} className="card-glass p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-near-black">{task.draft?.title}</p>
                  <p className="badge mt-1">{task.appName}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(task.draft?.content ?? '');
                      setCopiedTaskId(task.id);
                      setTimeout(() => setCopiedTaskId(null), 2000);
                    }}
                    className="btn-ghost text-xs">
                    {copiedTaskId === task.id ? <><Check size={13} /> 已复制</> : <><Copy size={13} /> 复制</>}
                  </button>
                  {!task.publish?.published && (
                    <button type="button" onClick={() => onMarkPublished(task.id, '')}
                      className="btn-terracotta text-xs px-3 py-1.5"><Send size={13} /> 标记已发布</button>
                  )}
                  {task.publish?.published && (
                    <span className="flex items-center gap-1 text-xs text-sage-green"><CheckCircle2 size={13} /> 已发布</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          {!allPublished && (
            <button type="button" onClick={onMarkAllPublished} className="btn-ghost text-xs"><Check size={13} /> 全部标记已发布</button>
          )}
          {allPublished && (
            <button type="button" onClick={onAdvance} className="btn-terracotta" disabled={advancing}>
              {advancing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              进入反馈阶段
            </button>
          )}
        </div>
      </section>
    );
  }

  // awaiting_feedback
  if (cycle.stage === 'awaiting_feedback') {
    const hasFeedback = cycle.tasks.some((t) => t.feedback);
    return (
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-near-black">等待效果反馈</h3>
        <p className="text-sm text-olive-gray">发布后请截图或填写平台数据。右侧面板可以拖入截图或手动填写。</p>
        <div className="space-y-2">
          {cycle.tasks
            .filter((t) => t.status === 'confirmed' || t.status === 'published' || t.status === 'feedback_done')
            .map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-xl border border-border-cream bg-ivory/70 px-4 py-3">
                <span className="text-sm text-near-black">{task.draft?.title ?? task.appName}</span>
                <span className={`text-xs ${task.feedback ? 'text-sage-green' : 'text-stone-gray'}`}>
                  {task.feedback ? '已反馈' : '等待中'}
                </span>
              </div>
            ))}
        </div>
        {hasFeedback && (
          <button type="button" onClick={onSubmitAllFeedback} className="btn-terracotta" disabled={advancing}>
            {advancing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            提交反馈，开始复盘
          </button>
        )}
        <button type="button" onClick={onSubmitAllFeedback} className="btn-ghost text-xs">
          <RefreshCw size={13} /> 跳过反馈，直接复盘
        </button>
      </section>
    );
  }

  // awaiting_memory
  if (cycle.stage === 'awaiting_memory') {
    const pendingMemories = cycle.memoryCandidates.filter((mc) => mc.status === 'pending');
    return (
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-near-black">确认经验记忆</h3>
        {cycle.review && (
          <div className="card-glass p-4">
            <p className="text-label">复盘总结</p>
            <p className="mt-1 text-sm text-olive-gray">{cycle.review.summary}</p>
          </div>
        )}
        <LoopMemoryPanel candidates={pendingMemories} onConfirm={onConfirmMemory} onReject={onRejectMemory} />
        <div className="flex gap-3">
          <button type="button" onClick={onConfirmAllMemory} className="btn-terracotta" disabled={advancing}>
            {advancing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            完成本轮
          </button>
          <button type="button" onClick={onAdvance} className="btn-ghost text-xs">跳过记忆确认</button>
        </div>
      </section>
    );
  }

  return (
    <div className="text-center text-sm text-stone-gray py-12">
      <Plus size={24} className="mx-auto text-stone-gray mb-2" />
      <p>未知状态：{cycle.stage}</p>
    </div>
  );
}
