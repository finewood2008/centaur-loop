import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Edit3, Eye, X } from 'lucide-react';
import type { LoopTask } from '../core/types';
import { useI18n } from '../i18n';

interface LoopDraftCardProps {
  task: LoopTask;
  onApprove: () => void;
  onReject: (note: string) => void;
  onViewFull: () => void;
}

export default function LoopDraftCard({ task, onApprove, onReject, onViewFull }: LoopDraftCardProps) {
  const { t } = useI18n();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [expanded, setExpanded] = useState(false);

  const isConfirmed = task.status === 'confirmed';
  const isRejected = task.status === 'rejected';
  const isReviewed = isConfirmed || isRejected;

  return (
    <article className={`rounded-2xl border p-4 transition-shadow ${
      isConfirmed ? 'border-sage-green/30 bg-sage-green/5'
        : isRejected ? 'border-terracotta/20 bg-terracotta/5'
        : 'border-border-cream bg-white/70 hover:shadow-sm'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="badge">{task.appName}</span>
            <span className="rounded-full bg-warm-sand/60 px-2 py-0.5 text-xs text-olive-gray">
              {t(`artifact.${task.artifactType}`)}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-near-black">
            {task.draft?.title ?? `${task.appName} · 草稿`}
          </h3>
        </div>
        {isConfirmed && <span className="flex items-center gap-1 text-xs text-sage-green"><Check size={14} /> {t('draft.confirmed')}</span>}
        {isRejected && <span className="flex items-center gap-1 text-xs text-terracotta"><X size={14} /> {t('draft.rejected')}</span>}
      </div>

      {task.draft && (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-olive-gray">
            {expanded ? task.draft.content : task.draft.preview}
          </p>
          {task.draft.content.length > 200 && (
            <button type="button" onClick={() => setExpanded(!expanded)}
              className="mt-1 flex items-center gap-1 text-xs text-terracotta hover:underline">
              {expanded ? <><ChevronUp size={12} /> {t('draft.collapse')}</> : <><ChevronDown size={12} /> {t('draft.expand')}</>}
            </button>
          )}
        </div>
      )}

      {isRejected && task.confirmation?.note && (
        <div className="mt-3 rounded-xl border border-terracotta/15 bg-terracotta/5 p-3">
          <p className="text-xs text-stone-gray">{t('draft.rejectNote')}</p>
          <p className="mt-1 text-sm text-near-black">{task.confirmation.note}</p>
        </div>
      )}

      {!isReviewed && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onViewFull} className="btn-ghost text-xs"><Eye size={13} /> {t('draft.view')}</button>
          <button type="button" onClick={onApprove} className="btn-terracotta text-xs px-3 py-1.5"><Check size={13} /> {t('draft.approve')}</button>
          <button type="button" onClick={() => setRejectOpen(!rejectOpen)} className="btn-ghost text-xs"><Edit3 size={13} /> {t('draft.reject')}</button>
        </div>
      )}

      {rejectOpen && !isReviewed && (
        <div className="mt-3 space-y-2">
          <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
            placeholder={t('draft.rejectPlaceholder')} rows={2}
            className="w-full resize-none rounded-xl border border-border-cream bg-ivory px-3 py-2 text-sm text-near-black outline-none focus:border-terracotta/40" />
          <div className="flex gap-2">
            <button type="button" disabled={!rejectNote.trim()}
              onClick={() => { onReject(rejectNote.trim()); setRejectOpen(false); setRejectNote(''); }}
              className="btn-terracotta text-xs px-3 py-1.5 disabled:opacity-40">{t('draft.submitReject')}</button>
            <button type="button" onClick={() => { setRejectOpen(false); setRejectNote(''); }}
              className="btn-ghost text-xs">{t('draft.cancel')}</button>
          </div>
        </div>
      )}
    </article>
  );
}
