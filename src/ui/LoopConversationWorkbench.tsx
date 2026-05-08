import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, CheckCircle2, Cpu, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { ALL_LOOP_CONFIGS } from '../core/loopConfigs';
import { useLoopStore } from '../core/loopStore';
import type { LoopStage } from '../core/types';
import { listAgentMemories, type MemoryEntry } from '../adapters/memory';
import { getLoopConfigLabel, useI18n } from '../i18n';
import { LoopChatController } from '../protocol/loopChat';
import type { LoopChatSession, UserAction } from '../protocol/types';
import type { RuntimeState } from '../hooks/useRuntimeStatus';
import ChatBubble from './ChatBubble';

interface LoopConversationWorkbenchProps {
  runtime: RuntimeState;
}

const STAGE_ORDER: LoopStage[] = [
  'planning',
  'awaiting_plan_review',
  'generating',
  'awaiting_review',
  'awaiting_publish',
  'awaiting_feedback',
  'reviewing_auto',
  'awaiting_memory',
  'cycle_complete',
];

function RuntimeCenter({ runtime }: { runtime: RuntimeState }) {
  const { t } = useI18n();

  return (
    <section className="card-glass p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-overline">{t('runtime.center')}</p>
          <h2 className="mt-1 flex items-center gap-2 text-sm font-semibold text-near-black">
            <Cpu size={15} className={runtime.mode === 'real' ? 'text-sage-green' : 'text-amber-warm'} />
            {runtime.mode === 'real' ? t('runtime.real') : t('runtime.demo')}
          </h2>
        </div>
        <button type="button" onClick={() => void runtime.rescan()} className="btn-ghost text-xs">
          <Search size={13} /> {t('runtime.scan')}
        </button>
      </div>

      <p className="mt-2 text-xs leading-5 text-olive-gray">{t('runtime.configureHint')}</p>

      <div className="mt-3 space-y-2">
        {runtime.connectors.map((connector) => {
          const selected = runtime.selectedRuntimeId === connector.id;
          const enabled = connector.available;
          return (
            <button
              key={connector.id}
              type="button"
              disabled={!enabled}
              onClick={() => runtime.selectRuntime(connector.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                selected
                  ? 'border-terracotta/35 bg-terracotta/10'
                  : enabled
                    ? 'border-border-cream bg-ivory/80 hover:border-terracotta/25'
                    : 'border-border-cream bg-warm-sand/25 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-near-black">{connector.label}</p>
                  <p className="mt-0.5 truncate text-xs text-stone-gray">{connector.model}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                  enabled ? 'bg-sage-green/15 text-sage-green' : 'bg-warm-sand text-stone-gray'
                }`}>
                  {selected ? t('runtime.connected') : enabled ? t('runtime.availableShort') : t('runtime.unavailableShort')}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-olive-gray">{connector.message}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CycleMap({ configId }: { configId: string }) {
  const { t } = useI18n();
  const cycle = useLoopStore((s) => {
    const cycleId = s.activeCycleIds[configId];
    return cycleId ? s.cycles[cycleId] : null;
  });

  if (!cycle) {
    return (
      <section className="card-glass p-4">
        <p className="text-overline">{t('chat.progressTitle')}</p>
        <p className="mt-2 text-sm text-stone-gray">{t('workspace.noCycle')}</p>
      </section>
    );
  }

  const currentIdx = STAGE_ORDER.indexOf(cycle.stage);

  return (
    <section className="card-glass p-4">
      <p className="text-overline">{t('chat.progressTitle')}</p>
      <p className="mt-1 text-sm font-medium text-near-black">#{cycle.cycleNumber}</p>
      <p className="mt-1 text-xs leading-5 text-olive-gray">{cycle.goal}</p>
      <div className="mt-3 space-y-1.5">
        {STAGE_ORDER.map((stage, index) => (
          <div key={stage} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${
              index < currentIdx ? 'bg-sage-green' : index === currentIdx ? 'bg-terracotta animate-pulse' : 'bg-warm-sand'
            }`} />
            <span className={`text-xs ${
              index === currentIdx ? 'font-medium text-near-black' : index < currentIdx ? 'text-sage-green' : 'text-stone-gray'
            }`}>
              {t(`stageLabel.${stage}`)}
            </span>
          </div>
        ))}
      </div>
      {(cycle.usedMemories?.length ?? 0) > 0 && (
        <div className="mt-3 rounded-xl border border-sage-green/20 bg-sage-green/10 p-3">
          <p className="flex items-center gap-1.5 text-xs text-sage-green">
            <CheckCircle2 size={13} /> {t('memory.used')}
          </p>
        </div>
      )}
    </section>
  );
}

function MemoryShelf({ employeeId }: { employeeId: string }) {
  const { t } = useI18n();
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const cycles = useLoopStore((s) => s.cycles);

  useEffect(() => {
    listAgentMemories(employeeId, 6).then(setMemories);
  }, [employeeId, cycles]);

  return (
    <section className="card-glass p-4">
      <p className="text-overline">{t('memory.confirmedTitle')}</p>
      {memories.length === 0 ? (
        <p className="mt-2 text-sm text-stone-gray">{t('memory.empty')}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {memories.map((memory) => (
            <div key={memory.id} className="rounded-xl border border-border-cream bg-ivory/70 p-3">
              <p className="text-sm leading-5 text-near-black">{memory.content}</p>
              <p className="mt-1 text-xs text-stone-gray">{memory.category}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function LoopConversationWorkbench({ runtime }: LoopConversationWorkbenchProps) {
  const { t, locale } = useI18n();
  const [activeConfigId, setActiveConfigId] = useState(ALL_LOOP_CONFIGS[0]?.id ?? '');
  const [session, setSession] = useState<LoopChatSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const controllerRef = useRef<LoopChatController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const config = ALL_LOOP_CONFIGS.find((candidate) => candidate.id === activeConfigId);

  useEffect(() => {
    if (!config) return;
    const store = useLoopStore.getState();
    store.registerLoop(config);
    const controller = new LoopChatController(config, (updated) => setSession({ ...updated }), locale);
    controllerRef.current = controller;
    setSession(controller.getSession());
  }, [config, locale]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !controllerRef.current || sending) return;
    setInputText('');
    setSending(true);
    try {
      await controllerRef.current.handleUserInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, sending]);

  const handleAction = useCallback(async (action: UserAction) => {
    if (!controllerRef.current || sending) return;
    setSending(true);
    try {
      if (action.type === 'start_loop' && action.payload?.goal) {
        await controllerRef.current.handleUserInput(action.payload.goal);
      } else {
        await controllerRef.current.handleAction(action);
      }
    } finally {
      setSending(false);
    }
  }, [sending]);

  const handleReset = useCallback(() => {
    if (!config) return;
    const controller = new LoopChatController(config, (updated) => setSession({ ...updated }), locale);
    controllerRef.current = controller;
    setSession(controller.getSession());
  }, [config, locale]);

  if (!config) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <main className="min-w-0 rounded-2xl border border-border-cream bg-white/65 backdrop-blur-sm">
        <div className="flex flex-col gap-3 border-b border-border-cream px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-overline">{t('chat.title')}</p>
            <h2 className="mt-1 text-base font-semibold text-near-black">{t('chat.subtitle')}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ALL_LOOP_CONFIGS.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setActiveConfigId(candidate.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                  activeConfigId === candidate.id
                    ? 'bg-terracotta/10 text-terracotta font-medium'
                    : 'text-olive-gray hover:bg-warm-sand/50'
                }`}
              >
                <span>{candidate.icon}</span> {getLoopConfigLabel(candidate.id, locale)}
              </button>
            ))}
            <button type="button" onClick={handleReset} className="btn-ghost text-xs" title={t('chat.reset')}>
              <RotateCcw size={13} /> {t('chat.reset')}
            </button>
          </div>
        </div>

        <div className="flex flex-col" style={{ height: 'calc(100vh - 238px)', minHeight: '560px' }}>
          <div className="flex-1 overflow-y-auto bg-parchment/45 px-4 py-5">
            <div className="mx-auto max-w-3xl space-y-4">
              {session?.messages.map((message, index) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  onAction={handleAction}
                  isLast={index === (session?.messages.length ?? 0) - 1}
                />
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="border-t border-border-cream bg-white/80 px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={session?.status === 'idle' ? t('chat.placeholderIdle') : t('chat.placeholderRunning')}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border-cream bg-ivory px-4 py-2.5 text-sm text-near-black outline-none focus:border-terracotta/40 placeholder:text-stone-gray"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!inputText.trim() || sending}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta text-white transition hover:bg-terracotta/90 disabled:opacity-40"
              >
                {sending ? <RefreshCw size={18} className="animate-spin" /> : <ArrowUp size={18} />}
              </button>
            </div>
            <p className="mx-auto mt-1.5 max-w-3xl text-[10px] text-stone-gray">{t('chat.hint')}</p>
          </div>
        </div>
      </main>

      <aside className="space-y-4">
        <RuntimeCenter runtime={runtime} />
        <CycleMap configId={activeConfigId} />
        <MemoryShelf employeeId={config.employeeId} />
      </aside>
    </div>
  );
}

