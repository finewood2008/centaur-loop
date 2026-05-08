/**
 * ChatBubble — 对话气泡组件
 *
 * 根据 LoopMessage.type 渲染不同形态：
 * - text: 普通文字气泡
 * - plan_card / draft_card / review_card 等：带卡片内容的气泡
 * - quick_actions: 快捷按钮组
 * - progress: 加载态
 */

import { useState } from 'react';
import { Bot, Check, ChevronDown, ChevronUp, Copy, Loader2, User } from 'lucide-react';
import type { LoopMessage, QuickAction, UserAction } from '../protocol/types';

interface ChatBubbleProps {
  message: LoopMessage;
  onAction?: (action: UserAction) => void;
  isLast?: boolean;
}

function ActionButtons({ actions, onAction }: { actions: QuickAction[]; onAction?: (a: UserAction) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {actions.map((a) => (
        <button key={a.id} type="button" onClick={() => onAction?.(a.action)}
          className={a.variant === 'primary' ? 'btn-terracotta text-xs px-3 py-1.5' :
            a.variant === 'danger' ? 'btn-ghost text-xs text-terracotta' : 'btn-ghost text-xs'}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

function DraftExpander({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-2 rounded-xl border border-border-cream bg-ivory/80 p-3">
      <div className="flex items-center justify-between mb-1">
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-terracotta hover:underline">
          {expanded ? <><ChevronUp size={12} /> 收起全文</> : <><ChevronDown size={12} /> 展开全文</>}
        </button>
        <button type="button" onClick={() => {
          navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }} className="flex items-center gap-1 text-xs text-olive-gray hover:text-near-black">
          {copied ? <><Check size={11} /> 已复制</> : <><Copy size={11} /> 复制</>}
        </button>
      </div>
      {expanded && (
        <pre className="mt-2 max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-olive-gray">
          {content}
        </pre>
      )}
    </div>
  );
}

export default function ChatBubble({ message, onAction, isLast }: ChatBubbleProps) {
  const isAI = message.role === 'ai' || message.role === 'system';
  const isProgress = message.type === 'progress';

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      {/* 头像 */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        isAI ? 'bg-terracotta/10 text-terracotta' : 'bg-warm-sand text-olive-gray'
      }`}>
        {isAI ? <Bot size={16} /> : <User size={16} />}
      </div>

      {/* 气泡 */}
      <div className={`max-w-[75%] min-w-0 ${isAI ? '' : 'text-right'}`}>
        <div className={`inline-block rounded-2xl px-4 py-3 text-sm leading-6 ${
          isAI
            ? 'bg-white/80 border border-border-cream text-near-black'
            : 'bg-terracotta text-white'
        } ${isProgress && isLast ? 'animate-pulse' : ''}`}>

          {/* 进度态 */}
          {isProgress && isLast && (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span>{message.text}</span>
            </div>
          )}

          {/* 普通文本 */}
          {!isProgress && (
            <div className="whitespace-pre-wrap">{message.text}</div>
          )}

          {/* 进度但不是最新的（历史记录） */}
          {isProgress && !isLast && (
            <div className="text-stone-gray">{message.text}</div>
          )}

          {/* 草稿展开器 */}
          {message.metadata?.draft && (
            <DraftExpander content={message.metadata.draft.content} />
          )}

          {/* 快捷按钮 */}
          {message.metadata?.actions && isLast && (
            <ActionButtons actions={message.metadata.actions} onAction={onAction} />
          )}
        </div>

        {/* 时间戳 */}
        <p className={`mt-1 text-[10px] text-stone-gray ${isAI ? '' : 'text-right'}`}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
