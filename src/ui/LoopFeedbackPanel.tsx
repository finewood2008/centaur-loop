import { useEffect, useState } from 'react';
import { Camera, MessageSquare, Star } from 'lucide-react';
import type { LoopCycle, QuickFeedbackInput } from '../core/types';
import { listAgentMemories, type MemoryEntry } from '../adapters/memory';
import { useI18n } from '../i18n';
import ScreenshotDropZone from './ScreenshotDropZone';
import LoopMemoryPanel from './LoopMemoryPanel';

interface LoopFeedbackPanelProps {
  cycle: LoopCycle | null;
  onSubmitQuickFeedback: (taskId: string, data: QuickFeedbackInput) => void;
  onSubmitScreenshot: (taskId: string, base64: string) => Promise<void>;
  onConfirmMemory: (candidateId: string) => void;
  onRejectMemory: (candidateId: string) => void;
}

const RATING_OPTIONS: { value: 'good' | 'ok' | 'bad'; labelKey: 'feedback.good' | 'feedback.ok' | 'feedback.bad'; color: string }[] = [
  { value: 'good', labelKey: 'feedback.good', color: 'border-sage-green/30 bg-sage-green/10 text-sage-green' },
  { value: 'ok', labelKey: 'feedback.ok', color: 'border-amber-warm/30 bg-amber-warm/10 text-amber-warm' },
  { value: 'bad', labelKey: 'feedback.bad', color: 'border-terracotta/30 bg-terracotta/10 text-terracotta' },
];

export default function LoopFeedbackPanel({
  cycle, onSubmitQuickFeedback, onSubmitScreenshot, onConfirmMemory, onRejectMemory,
}: LoopFeedbackPanelProps) {
  const { t } = useI18n();
  const [confirmedMemories, setConfirmedMemories] = useState<MemoryEntry[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>(
    cycle?.tasks.find((t) => t.status === 'confirmed' || t.status === 'published')?.id,
  );
  const [screenshotProcessing, setScreenshotProcessing] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<QuickFeedbackInput>({ published: false, rating: undefined });

  useEffect(() => {
    listAgentMemories(cycle?.employeeId ?? 'spark', 8).then(setConfirmedMemories);
  }, [cycle?.employeeId, cycle?.memoryCandidates]);

  const confirmedTasks = cycle?.tasks.filter(
    (t) => t.status === 'confirmed' || t.status === 'published' || t.status === 'feedback_done',
  ) ?? [];

  const handleScreenshot = async (base64: string) => {
    if (!activeTaskId) return;
    setScreenshotProcessing(true);
    try { await onSubmitScreenshot(activeTaskId, base64); } finally { setScreenshotProcessing(false); }
  };

  const handleSubmitForm = () => {
    if (!activeTaskId) return;
    onSubmitQuickFeedback(activeTaskId, feedbackForm);
    setFeedbackForm({ published: false, rating: undefined });
  };

  const pendingMemories = cycle?.memoryCandidates.filter((mc) => mc.status === 'pending') ?? [];
  const usedMemory = (cycle?.usedMemories?.length ?? 0) > 0;

  return (
    <aside className="card-glass sticky top-5 h-fit space-y-4 p-4">
      <h3 className="text-sm font-semibold text-near-black">{t('feedback.title')}</h3>

      <div className={`rounded-xl border px-3 py-2 text-xs ${
        usedMemory ? 'border-sage-green/25 bg-sage-green/10 text-sage-green' : 'border-border-cream bg-ivory/70 text-stone-gray'
      }`}>
        {usedMemory ? t('memory.used') : t('memory.notUsed')}
      </div>

      {confirmedTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-label">{t('feedback.selectContent')}</p>
          <div className="flex flex-wrap gap-1.5">
            {confirmedTasks.map((task) => (
              <button key={task.id} type="button" onClick={() => setActiveTaskId(task.id)}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  activeTaskId === task.id
                    ? 'bg-terracotta/15 text-terracotta ring-1 ring-terracotta/30'
                    : 'bg-warm-sand/50 text-olive-gray hover:bg-warm-sand'
                }`}>{task.appName}</button>
            ))}
          </div>
        </div>
      )}

      {(cycle?.stage === 'awaiting_feedback' || cycle?.stage === 'awaiting_publish') && (
        <div>
          <p className="text-label mb-2 flex items-center gap-1.5"><Camera size={13} /> {t('feedback.screenshot')}</p>
          <ScreenshotDropZone onScreenshot={handleScreenshot} processing={screenshotProcessing} />
        </div>
      )}

      {(cycle?.stage === 'awaiting_feedback' || cycle?.stage === 'awaiting_publish') && (
        <div className="space-y-3">
          <p className="text-label flex items-center gap-1.5"><MessageSquare size={13} /> {t('feedback.quick')}</p>
          <label className="flex items-center gap-2 text-sm text-near-black">
            <input type="checkbox" checked={feedbackForm.published}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, published: e.target.checked })}
              className="rounded border-border-cream" /> {t('feedback.published')}
          </label>
          {feedbackForm.published && (
            <input type="text" placeholder={t('feedback.platform')}
              value={feedbackForm.platform ?? ''}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, platform: e.target.value })}
              className="w-full rounded-xl border border-border-cream bg-ivory px-3 py-2 text-sm outline-none focus:border-terracotta/40" />
          )}
          <div>
            <p className="text-label mb-1.5 flex items-center gap-1.5"><Star size={13} /> {t('feedback.rating')}</p>
            <div className="flex gap-2">
              {RATING_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setFeedbackForm({ ...feedbackForm, rating: opt.value })}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    feedbackForm.rating === opt.value ? opt.color : 'border-border-cream bg-ivory text-olive-gray'
                  }`}>{t(opt.labelKey)}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['views', 'likes', 'favorites', 'comments'] as const).map((key) => (
              <input key={key} type="number"
                placeholder={{ views: t('feedback.views'), likes: t('feedback.likes'), favorites: t('feedback.favorites'), comments: t('feedback.comments') }[key]}
                value={feedbackForm[key] ?? ''}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, [key]: e.target.value ? Number(e.target.value) : undefined })}
                className="rounded-xl border border-border-cream bg-ivory px-3 py-2 text-sm outline-none focus:border-terracotta/40" />
            ))}
          </div>
          <textarea placeholder={t('feedback.note')} value={feedbackForm.ownerNote ?? ''}
            onChange={(e) => setFeedbackForm({ ...feedbackForm, ownerNote: e.target.value })}
            rows={2}
            className="w-full resize-none rounded-xl border border-border-cream bg-ivory px-3 py-2 text-sm outline-none focus:border-terracotta/40" />
          <button type="button" onClick={handleSubmitForm} disabled={!activeTaskId}
            className="btn-terracotta w-full justify-center text-sm disabled:opacity-40">{t('feedback.submit')}</button>
        </div>
      )}

      {pendingMemories.length > 0 && (
        <LoopMemoryPanel candidates={pendingMemories} onConfirm={onConfirmMemory} onReject={onRejectMemory} />
      )}

      <section className="space-y-2 border-t border-border-cream pt-3">
        <h4 className="text-label">{t('memory.confirmedTitle')}</h4>
        {confirmedMemories.length === 0 ? (
          <p className="text-xs text-stone-gray">{t('memory.empty')}</p>
        ) : (
          <div className="space-y-2">
            {confirmedMemories.map((memory) => (
              <div key={memory.id} className="rounded-xl border border-border-cream bg-ivory/70 p-3">
                <p className="text-sm leading-5 text-near-black">{memory.content}</p>
                <p className="mt-1 text-xs text-stone-gray">{memory.category}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
