import type { CentaurLoopConfig, LoopCycle, LoopStage } from '../core/types';
import { useI18n, getLoopConfigLabel } from '../i18n';

interface LoopProgressSidebarProps {
  cycle: LoopCycle | null;
  config: CentaurLoopConfig;
  allConfigs: CentaurLoopConfig[];
  activeConfigId: string;
  onSwitchConfig: (configId: string) => void;
}

const STAGE_ORDER: LoopStage[] = [
  'planning', 'awaiting_plan_review', 'generating', 'awaiting_review',
  'awaiting_publish', 'awaiting_feedback', 'reviewing_auto', 'awaiting_memory', 'cycle_complete',
];

function getStageStatus(stage: LoopStage, currentStage: LoopStage): 'done' | 'active' | 'pending' {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  if (stageIndex < currentIndex) return 'done';
  if (stageIndex === currentIndex) return 'active';
  return 'pending';
}

export default function LoopProgressSidebar({
  cycle, config, allConfigs, activeConfigId, onSwitchConfig,
}: LoopProgressSidebarProps) {
  const { t, locale } = useI18n();

  return (
    <aside className="card-glass sticky top-5 h-fit p-4">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-sand text-2xl">
            {config.icon}
          </span>
          <div className="min-w-0">
            <p className="text-overline">{t('sidebar.progress')}</p>
            <h3 className="font-serif text-lg text-near-black">{getLoopConfigLabel(config.id, locale)}</h3>
          </div>
        </div>
        {cycle && (
          <p className="mt-2 text-xs text-olive-gray">
            #{cycle.cycleNumber} · {cycle.goal.slice(0, 30)}{cycle.goal.length > 30 ? '…' : ''}
          </p>
        )}
      </div>

      {cycle && (
        <div className="space-y-1.5">
          {STAGE_ORDER.map((stage) => {
            const status = getStageStatus(stage, cycle.stage);
            return (
              <div key={stage} className="flex items-center gap-2 rounded-lg px-2 py-1">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  status === 'done' ? 'bg-sage-green'
                    : status === 'active' ? 'bg-terracotta animate-pulse'
                    : 'bg-warm-sand'
                }`} />
                <span className={`text-xs ${
                  status === 'active' ? 'font-medium text-near-black'
                    : status === 'done' ? 'text-sage-green'
                    : 'text-stone-gray'
                }`}>{t(`stageLabel.${stage}`)}</span>
              </div>
            );
          })}
        </div>
      )}

      {!cycle && <p className="text-sm text-stone-gray">{t('workspace.noCycle')}</p>}

      <div className="mt-4 border-t border-border-cream pt-3 space-y-1.5">
        {allConfigs.map((c) => (
          <button key={c.id} type="button" onClick={() => onSwitchConfig(c.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
              activeConfigId === c.id ? 'bg-terracotta/10 text-near-black' : 'text-olive-gray hover:bg-warm-sand/50'
            }`}>
            <span className="text-base">{c.icon}</span>
            <span className="text-xs">{getLoopConfigLabel(c.id, locale)}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
