import { Brain, Check, X } from 'lucide-react';
import type { MemoryCandidate } from '../core/types';
import { useI18n } from '../i18n';

interface LoopMemoryPanelProps {
  candidates: MemoryCandidate[];
  onConfirm: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
}

export default function LoopMemoryPanel({ candidates, onConfirm, onReject }: LoopMemoryPanelProps) {
  const { t } = useI18n();
  if (candidates.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-label flex items-center gap-1.5">
        <Brain size={13} /> {t('memory.candidates')} ({candidates.length})
      </h4>
      <div className="space-y-2">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="rounded-xl border border-border-cream bg-ivory/70 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-sm leading-5 text-near-black">{candidate.content}</p>
              <span className="shrink-0 rounded-full bg-warm-sand/60 px-2 py-0.5 text-xs text-olive-gray">
                {t(`memory.${candidate.category}`)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-stone-gray">{candidate.source}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => onConfirm(candidate.id)}
                className="flex items-center gap-1 rounded-lg border border-sage-green/30 bg-sage-green/10 px-2.5 py-1 text-xs text-sage-green transition hover:bg-sage-green/20">
                <Check size={12} /> {t('memory.confirm')}
              </button>
              <button type="button" onClick={() => onReject(candidate.id)}
                className="flex items-center gap-1 rounded-lg border border-border-cream bg-ivory px-2.5 py-1 text-xs text-stone-gray transition hover:bg-warm-sand/50">
                <X size={12} /> {t('memory.reject')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
