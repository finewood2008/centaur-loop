import { useEffect } from 'react';
import { useLoopStore } from './core/loopStore';
import { ALL_LOOP_CONFIGS } from './core/loopConfigs';
import LoopConversationWorkbench from './ui/LoopConversationWorkbench';
import { I18nProvider, useI18n } from './i18n';
import { useRuntimeStatus } from './hooks/useRuntimeStatus';
import { BookOpen, Github, Languages, SlidersHorizontal } from 'lucide-react';
import RuntimeDropdown from './ui/RuntimeDropdown';

function AppShell() {
  const { t, toggleLocale } = useI18n();
  const runtime = useRuntimeStatus();
  const registerLoop = useLoopStore((s) => s.registerLoop);

  useEffect(() => {
    for (const config of ALL_LOOP_CONFIGS) {
      registerLoop(config);
    }
  }, [registerLoop]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      <header className="mb-4 rounded-2xl border border-border-cream bg-white/75 px-4 py-4 backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-near-black">Centaur Loop</h1>
              <span className="badge"><SlidersHorizontal size={12} /> Chat-first Workbench</span>
            </div>
            <p className="mt-1 text-sm font-medium text-near-black">{t('app.tagline')}</p>
            <p className="mt-1 text-xs leading-5 text-olive-gray">{t('app.thesis')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a href="https://github.com/finewood2008/centaur-loop" target="_blank" rel="noreferrer" className="btn-ghost">
              <Github size={15} /> {t('app.github')}
            </a>
            <a href="https://github.com/finewood2008/centaur-loop#readme" target="_blank" rel="noreferrer" className="btn-ghost">
              <BookOpen size={15} /> {t('app.docs')}
            </a>
            <button type="button" onClick={toggleLocale} className="btn-ghost">
              <Languages size={15} /> {t('app.language')}
            </button>
          </div>
        </div>
      </header>
      <LoopConversationWorkbench runtime={runtime} />
      <RuntimeDropdown runtime={runtime} floating />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}
