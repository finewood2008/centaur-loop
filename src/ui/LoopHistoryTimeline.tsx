import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock3 } from 'lucide-react';
import type { LoopCycle } from '../core/types';
import { useI18n } from '../i18n';

interface LoopHistoryTimelineProps {
  history: LoopCycle[];
}

function formatDate(isoString: string | undefined, locale: string, fallback: string): string {
  if (!isoString) return fallback;
  const d = new Date(isoString);
  return d.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' });
}

export default function LoopHistoryTimeline({ history }: LoopHistoryTimelineProps) {
  const { t, locale } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) {
    return <div className="text-center text-sm text-stone-gray py-6">{t('history.empty')}</div>;
  }

  return (
    <div className="space-y-2">
      {history.map((cycle) => {
        const isExpanded = expandedId === cycle.id;
        const confirmedCount = cycle.tasks.filter(
          (t) => t.status === 'confirmed' || t.status === 'published' || t.status === 'feedback_done',
        ).length;

        return (
          <div key={cycle.id} className="rounded-2xl border border-border-cream bg-ivory/70">
            <button type="button" onClick={() => setExpandedId(isExpanded ? null : cycle.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <Clock3 size={14} className="shrink-0 text-stone-gray" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-near-black">#{cycle.cycleNumber}</p>
                <p className="mt-0.5 truncate text-xs text-olive-gray">{cycle.goal}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-stone-gray">{formatDate(cycle.completedAt, locale, t('history.inProgress'))}</p>
                <p className="text-xs text-olive-gray">{confirmedCount} {t('history.outputs')}</p>
              </div>
              {isExpanded ? <ChevronDown size={14} className="text-stone-gray" /> : <ChevronRight size={14} className="text-stone-gray" />}
            </button>
            {isExpanded && (
              <div className="border-t border-border-cream px-4 py-3 space-y-2">
                {cycle.plan && <p className="text-sm text-olive-gray">{cycle.plan.summary}</p>}
                {cycle.review && (
                  <div className="rounded-xl bg-warm-sand/30 p-3">
                    <p className="text-xs font-medium text-near-black">{t('history.review')}</p>
                    <p className="mt-1 text-sm text-olive-gray">{cycle.review.summary}</p>
                  </div>
                )}
                {cycle.nextSuggestion && (
                  <p className="text-xs text-terracotta">{t('history.next')}: {cycle.nextSuggestion}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
