/**
 * LoopChatView — 对话式闭环原型主界面
 *
 * 左：对话流（主交互）
 * 右（xl）：轻量进度面板（只读）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, RotateCcw } from 'lucide-react';
import type { CentaurLoopConfig, LoopStage } from '../core/types';
import { useLoopStore } from '../core/loopStore';
import { ALL_LOOP_CONFIGS } from '../core/loopConfigs';
import { LoopChatController } from '../protocol/loopChat';
import type { LoopChatSession, UserAction } from '../protocol/types';
import { useMediaQuery } from '../hooks/useMediaQuery';
import ChatBubble from './ChatBubble';

// ── 轻量进度面板 ────────────────────────────────────────────

const STAGE_LABELS: Record<LoopStage, string> = {
  planning: '规划', awaiting_plan_review: '确认计划', generating: '生成',
  awaiting_review: '审核', awaiting_publish: '发布', awaiting_feedback: '反馈',
  reviewing_auto: '复盘', awaiting_memory: '记忆', cycle_complete: '完成',
};

const STAGE_ORDER: LoopStage[] = [
  'planning', 'awaiting_plan_review', 'generating', 'awaiting_review',
  'awaiting_publish', 'awaiting_feedback', 'reviewing_auto', 'awaiting_memory', 'cycle_complete',
];

function MiniProgress({ configId }: { configId: string }) {
  const cycle = useLoopStore((s) => {
    const cid = s.activeCycleIds[configId];
    return cid ? s.cycles[cid] : null;
  });

  if (!cycle) return <p className="text-xs text-stone-gray">暂无活跃循环</p>;

  const currentIdx = STAGE_ORDER.indexOf(cycle.stage);

  return (
    <div className="space-y-1">
      <p className="text-overline mb-2">第 {cycle.cycleNumber} 轮</p>
      {STAGE_ORDER.map((stage, i) => (
        <div key={stage} className="flex items-center gap-2 py-0.5">
          <span className={`h-2 w-2 rounded-full ${
            i < currentIdx ? 'bg-sage-green'
              : i === currentIdx ? 'bg-terracotta animate-pulse'
              : 'bg-warm-sand'
          }`} />
          <span className={`text-xs ${
            i === currentIdx ? 'font-medium text-near-black'
              : i < currentIdx ? 'text-sage-green' : 'text-stone-gray'
          }`}>{STAGE_LABELS[stage]}</span>
        </div>
      ))}
    </div>
  );
}

// ── 主视图 ──────────────────────────────────────────────────

export default function LoopChatView() {
  const isXl = useMediaQuery('(min-width: 1280px)');
  const [activeConfigId, setActiveConfigId] = useState(ALL_LOOP_CONFIGS[0]?.id ?? '');
  const [session, setSession] = useState<LoopChatSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const controllerRef = useRef<LoopChatController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const config = ALL_LOOP_CONFIGS.find((c) => c.id === activeConfigId);

  // 初始化 controller
  useEffect(() => {
    if (!config) return;
    const store = useLoopStore.getState();
    store.registerLoop(config);

    const controller = new LoopChatController(config, (updated) => {
      setSession({ ...updated });
    });
    controllerRef.current = controller;
    setSession(controller.getSession());
  }, [activeConfigId]);

  // 滚动到底
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

    // 如果是 start_loop 且有预设 goal，直接执行
    if (action.type === 'start_loop' && action.payload?.goal) {
      setSending(true);
      try {
        await controllerRef.current.handleUserInput(action.payload.goal);
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    try {
      await controllerRef.current.handleAction(action);
    } finally {
      setSending(false);
    }
  }, [sending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleReset = useCallback(() => {
    if (!config) return;
    // 清除 localStorage 中的循环数据
    const store = useLoopStore.getState();
    store.registerLoop(config);
    const controller = new LoopChatController(config, (updated) => {
      setSession({ ...updated });
    });
    controllerRef.current = controller;
    setSession(controller.getSession());
  }, [config]);

  if (!config) return null;

  return (
    <div className={isXl ? 'grid grid-cols-[1fr_200px] gap-4' : ''}>
      {/* 对话主区 */}
      <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
        {/* 顶栏 */}
        <div className="flex items-center justify-between border-b border-border-cream bg-white/60 px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {ALL_LOOP_CONFIGS.map((c) => (
              <button key={c.id} type="button" onClick={() => setActiveConfigId(c.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                  activeConfigId === c.id
                    ? 'bg-terracotta/10 text-terracotta font-medium'
                    : 'text-olive-gray hover:bg-warm-sand/50'
                }`}>
                <span>{c.icon}</span> {c.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleReset} className="btn-ghost text-xs" title="重置对话">
            <RotateCcw size={13} />
          </button>
        </div>

        {/* 消息流 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-parchment/50">
          {session?.messages.map((msg, i) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              onAction={handleAction}
              isLast={i === (session?.messages.length ?? 0) - 1}
            />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* 输入区 */}
        <div className="border-t border-border-cream bg-white/80 px-4 py-3 rounded-b-2xl">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                session?.status === 'idle'
                  ? `说出${config.cyclePeriod === 'daily' ? '今天' : '这周'}的目标…`
                  : '回复确认，或者说出你的想法…'
              }
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border-cream bg-ivory px-4 py-2.5 text-sm text-near-black outline-none focus:border-terracotta/40 placeholder:text-stone-gray"
            />
            <button type="button" onClick={handleSend}
              disabled={!inputText.trim() || sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta text-white transition hover:bg-terracotta/90 disabled:opacity-40">
              <ArrowUp size={18} />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-stone-gray">
            Enter 发送 · Shift+Enter 换行 · 直接说"行"或"通过"即可确认
          </p>
        </div>
      </div>

      {/* 右侧：轻量进度面板 */}
      {isXl && (
        <aside className="card-glass sticky top-5 h-fit p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{config.icon}</span>
            <h3 className="text-sm font-semibold text-near-black">{config.name}</h3>
          </div>
          <MiniProgress configId={activeConfigId} />
        </aside>
      )}
    </div>
  );
}
