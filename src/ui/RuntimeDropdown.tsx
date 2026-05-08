import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Cpu, RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n';
import type { RuntimeState } from '../hooks/useRuntimeStatus';

export default function RuntimeDropdown({ runtime }: { runtime: RuntimeState }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-sm transition ${
          runtime.mode === 'real'
            ? 'border-sage-green/30 bg-sage-green/10 text-sage-green'
            : 'border-border-cream bg-ivory/90 text-olive-gray hover:border-terracotta/25'
        }`}
      >
        <Cpu size={14} />
        <span className="font-medium">{runtime.model}</span>
        <span className="hidden text-stone-gray sm:inline">{runtime.provider}</span>
        <ChevronDown size={13} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border-cream bg-white/95 p-3 text-left shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 border-b border-border-cream pb-3">
            <div>
              <p className="text-overline">{t('runtime.center')}</p>
              <p className="mt-1 text-sm font-semibold text-near-black">
                {runtime.mode === 'real' ? t('runtime.real') : t('runtime.demo')}
              </p>
              <p className="mt-1 text-xs leading-5 text-olive-gray">{t('runtime.configureHint')}</p>
            </div>
            <button type="button" onClick={() => void runtime.rescan()} className="btn-ghost px-2 py-1 text-xs">
              <RefreshCw size={13} /> {t('runtime.scan')}
            </button>
          </div>

          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {runtime.connectors.map((connector) => {
              const selected = runtime.selectedRuntimeId === connector.id;
              return (
                <button
                  key={connector.id}
                  type="button"
                  disabled={!connector.available}
                  onClick={() => {
                    runtime.selectRuntime(connector.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? 'border-terracotta/35 bg-terracotta/10'
                      : connector.available
                        ? 'border-border-cream bg-ivory/80 hover:border-terracotta/25'
                        : 'border-border-cream bg-warm-sand/25 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-near-black">{connector.label}</p>
                      <p className="mt-0.5 truncate text-xs text-stone-gray">{connector.model}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                      selected
                        ? 'bg-terracotta/15 text-terracotta'
                        : connector.available
                          ? 'bg-sage-green/15 text-sage-green'
                          : 'bg-warm-sand text-stone-gray'
                    }`}>
                      {selected && <Check size={11} />}
                      {selected ? t('runtime.connected') : connector.available ? t('runtime.availableShort') : t('runtime.unavailableShort')}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-olive-gray">{connector.message}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

