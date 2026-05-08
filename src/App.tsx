import { useEffect } from 'react';
import { useLoopStore } from './core/loopStore';
import { ALL_LOOP_CONFIGS } from './core/loopConfigs';
import LoopChatView from './ui/LoopChatView';

export default function App() {
  const registerLoop = useLoopStore((s) => s.registerLoop);

  useEffect(() => {
    for (const config of ALL_LOOP_CONFIGS) {
      registerLoop(config);
    }
  }, [registerLoop]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-near-black">Centaur Loop</h1>
          <p className="text-xs text-olive-gray">对话驱动 · 半人马闭环引擎</p>
        </div>
        <span className="badge">v0.2.0 · Chat Mode</span>
      </header>
      <LoopChatView />
    </div>
  );
}
