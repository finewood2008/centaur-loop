import { useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, Copy, Loader2, Plus,
  RefreshCw, Send, Sparkles,
} from 'lucide-react';
import type { CentaurLoopConfig, LoopCycle, QuickFeedbackInput } from '../core/types';
import { useI18n, getLoopConfigLabel } from '../i18n';
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
  const { t, locale } = useI18n();
  const [goalDraft, setGoalDraft] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const configLabel = getLoopConfigLabel(config.id, locale);

  // 无活跃循环 / 已完成
  if (!cycle || cycle.stage === 'cycle_complete') {
    return (
      <div className="space-y-6">
        {cycle?.stage === 'cycle_complete' && cycle.review && (
          <section className="card-glass-warm p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-sage-green" />
              <h3 className="text-sm font-semibold text-near-black">{t('workspace.complete')} · #{cycle.cycleNumber}</h3>
            </div>
            <p className="text-sm text-olive-gray">{cycle.review.summary}</p>
            {cycle.review.effectivePoints.length > 0 && (
              <div className="mt-3">
                <p className="text-label text-sage-green">{t('workspace.effective')}</p>
                <ul className="mt-1 space-y-1">
                  {cycle.review.effectivePoints.map((p, i) => (
                    <li key={i} className="text-sm text-olive-gray">{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {cycle.nextSuggestion && (
              <div className="mt-3 rounded-xl border border-terracotta/15 bg-terracotta/5 p-3">
                <p className="text-label text-terracotta">{t('workspace.nextSuggestion')}</p>
                <p className="mt-1 text-sm text-near-black">{cycle.nextSuggestion}</p>
              </div>
            )}
          </section>
        )}

        <section className="card-glass p-5">
          <h3 className="text-sm font-semibold text-near-black mb-3">
            {cycle?.stage === 'cycle_complete' ? t('workspace.restartTitle') : `${t('workspace.startTitle')}: ${configLabel}`}
          </h3>
          <textarea value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)}
            placeholder={t('workspace.goalPlaceholderWeekly')}
            rows={3}
            className="w-full resize-none rounded-xl border border-border-cream bg-ivory px-4 py-3 text-sm text-near-black outline-none focus:border-terracotta/40" />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-stone-gray">
              {t('workspace.weekly')}
            </p>
            <button type="button" disabled={!goalDraft.trim() || advancing}
              onClick={() => { onStartCycle(goalDraft.trim()); setGoalDraft(''); }}
              className="btn-terracotta text-sm disabled:opacity-40">
              {advancing
                ? <><Loader2 size={14} className="animate-spin" /> {t('workspace.planning')}</>
                : <><Sparkles size={14} /> {t('workspace.start')}</>}
            </button>
          </div>
        </section>

        {history.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-near-black mb-3">{t('workspace.history')}</h3>
            <LoopHistoryTimeline history={history} />
          </section>
        )}
      </div>
    );
  }

  // AI 自动阶段
  if (cycle.stage === 'planning' || cycle.stage === 'generating' || cycle.stage === 'reviewing_auto') {
    const labels: Record<string, string> = {
      planning: t('stageLabel.planning'),
      generating: t('stageLabel.generating'),
      reviewing_auto: t('stageLabel.reviewing_auto'),
    };
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 size={32} className="animate-spin text-terracotta" />
        <p className="text-sm font-medium text-near-black">{labels[cycle.stage]}</p>
        <p className="text-xs text-olive-gray">{t('workspace.aiWorking')}</p>
      </div>
    );
  }

  // awaiting_plan_review
  if (cycle.stage === 'awaiting_plan_review' && cycle.plan) {
    return (
      <section className="space-y-4">
        <div className="card-glass p-5">
          <h3 className="text-sm font-semibold text-near-black mb-3">
            {t('workspace.planTitleWeekly')}
          </h3>
          <p className="text-sm text-olive-gray">{cycle.plan.summary}</p>
          {cycle.plan.platforms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cycle.plan.platforms.map((p) => <span key={p} className="badge">{p}</span>)}
            </div>
          )}
          {cycle.plan.keywords && cycle.plan.keywords.length > 0 && (
            <div className="mt-3">
              <p className="text-label">{t('workspace.keywords')}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {cycle.plan.keywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-warm-sand/60 px-2.5 py-0.5 text-xs text-olive-gray">{kw}</span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3">
            <p className="text-label">{t('workspace.tasks')} ({cycle.tasks.length})</p>
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
            {t('workspace.confirmPlan')}
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
            {t('workspace.drafts')} ({cycle.tasks.filter((t) => t.status === 'confirmed').length}/{cycle.tasks.length})
          </h3>
          {!allReviewed && (
            <button type="button" onClick={onConfirmAllDrafts} className="btn-ghost text-xs"><Check size={13} /> {t('workspace.approveAll')}</button>
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
            {t('workspace.publishTitle')}
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
        <h3 className="text-sm font-semibold text-near-black">{t('workspace.publishTitle')}</h3>
        <p className="text-sm text-olive-gray">{t('workspace.publishHelp')}</p>
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
                    {copiedTaskId === task.id ? <><Check size={13} /> {t('workspace.copied')}</> : <><Copy size={13} /> {t('workspace.copy')}</>}
                  </button>
                  {!task.publish?.published && (
                    <button type="button" onClick={() => onMarkPublished(task.id, '')}
                      className="btn-terracotta text-xs px-3 py-1.5"><Send size={13} /> {t('workspace.markPublished')}</button>
                  )}
                  {task.publish?.published && (
                    <span className="flex items-center gap-1 text-xs text-sage-green"><CheckCircle2 size={13} /> {t('feedback.published')}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          {!allPublished && (
            <button type="button" onClick={onMarkAllPublished} className="btn-ghost text-xs"><Check size={13} /> {t('workspace.markAllPublished')}</button>
          )}
          {allPublished && (
            <button type="button" onClick={onAdvance} className="btn-terracotta" disabled={advancing}>
              {advancing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              {t('workspace.nextFeedback')}
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
        <h3 className="text-sm font-semibold text-near-black">{t('workspace.feedbackTitle')}</h3>
        <p className="text-sm text-olive-gray">{t('workspace.feedbackHelp')}</p>
        <div className="space-y-2">
          {cycle.tasks
            .filter((t) => t.status === 'confirmed' || t.status === 'published' || t.status === 'feedback_done')
            .map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-xl border border-border-cream bg-ivory/70 px-4 py-3">
                <span className="text-sm text-near-black">{task.draft?.title ?? task.appName}</span>
                <span className={`text-xs ${task.feedback ? 'text-sage-green' : 'text-stone-gray'}`}>
                  {task.feedback ? t('workspace.feedbackReady') : t('workspace.feedbackWaiting')}
                </span>
              </div>
            ))}
        </div>
        {hasFeedback && (
          <button type="button" onClick={onSubmitAllFeedback} className="btn-terracotta" disabled={advancing}>
            {advancing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            {t('workspace.submitFeedback')}
          </button>
        )}
        <button type="button" onClick={onSubmitAllFeedback} className="btn-ghost text-xs">
          <RefreshCw size={13} /> {t('workspace.skipFeedback')}
        </button>
      </section>
    );
  }

  // awaiting_memory
  if (cycle.stage === 'awaiting_memory') {
    const pendingMemories = cycle.memoryCandidates.filter((mc) => mc.status === 'pending');
    return (
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-near-black">{t('workspace.memoryTitle')}</h3>
        {cycle.review && (
          <div className="card-glass p-4">
            <p className="text-label">{t('workspace.reviewSummary')}</p>
            <p className="mt-1 text-sm text-olive-gray">{cycle.review.summary}</p>
          </div>
        )}
        <LoopMemoryPanel candidates={pendingMemories} onConfirm={onConfirmMemory} onReject={onRejectMemory} />
        <div className="flex gap-3">
          <button type="button" onClick={onConfirmAllMemory} className="btn-terracotta" disabled={advancing}>
            {advancing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {t('workspace.finishCycle')}
          </button>
          <button type="button" onClick={onAdvance} className="btn-ghost text-xs">{t('workspace.skipMemory')}</button>
        </div>
      </section>
    );
  }

  return (
    <div className="text-center text-sm text-stone-gray py-12">
      <Plus size={24} className="mx-auto text-stone-gray mb-2" />
      <p>{t('workspace.unknown')}: {cycle.stage}</p>
    </div>
  );
}
