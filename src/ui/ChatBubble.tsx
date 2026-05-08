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
import { BarChart3, Bot, Brain, Check, ChevronDown, ChevronUp, ClipboardList, Copy, FileText, Loader2, Rocket, User } from 'lucide-react';
import type { LoopMessage, QuickAction, UserAction } from '../protocol/types';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-2 rounded-xl border border-border-cream bg-ivory/80 p-3">
      <div className="flex items-center justify-between mb-1">
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-terracotta hover:underline">
          {expanded ? <><ChevronUp size={12} /> {t('draft.collapse')}</> : <><ChevronDown size={12} /> {t('draft.expand')}</>}
        </button>
        <button type="button" onClick={() => {
          navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }} className="flex items-center gap-1 text-xs text-olive-gray hover:text-near-black">
          {copied ? <><Check size={11} /> {t('workspace.copied')}</> : <><Copy size={11} /> {t('workspace.copy')}</>}
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
  const { t } = useI18n();
  const isAI = message.role === 'ai' || message.role === 'system';
  const isProgress = message.type === 'progress';
  const isCard = ['plan_card', 'draft_card', 'publish_card', 'feedback_request', 'review_card', 'memory_card', 'cycle_complete', 'quick_actions'].includes(message.type);

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      {/* 头像 */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        isAI ? 'bg-terracotta/10 text-terracotta' : 'bg-warm-sand text-olive-gray'
      }`}>
        {isAI ? <Bot size={16} /> : <User size={16} />}
      </div>

      {/* 气泡 */}
      <div className={`${isCard ? 'max-w-[92%] w-full sm:w-[min(720px,92%)]' : 'max-w-[75%]'} min-w-0 ${isAI ? '' : 'text-right'}`}>
        <div className={`inline-block rounded-2xl px-4 py-3 text-sm leading-6 ${
          isAI
            ? 'bg-white/80 border border-border-cream text-near-black'
            : 'bg-terracotta text-white'
        } ${isCard ? 'w-full text-left shadow-sm' : ''} ${isProgress && isLast ? 'animate-pulse' : ''}`}>

          {/* 进度态 */}
          {isProgress && isLast && (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span>{message.text}</span>
            </div>
          )}

          {message.metadata?.plan && (
            <div className="mb-3 rounded-xl border border-border-cream bg-ivory/80 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-stone-gray">
                <ClipboardList size={13} /> {t('workspace.planTitleWeekly')}
              </p>
              <p className="text-sm font-medium leading-6 text-near-black">{message.metadata.plan.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {message.metadata.plan.platforms.map((platform) => <span key={platform} className="badge">{platform}</span>)}
                {message.metadata.plan.keywords?.map((keyword) => <span key={keyword} className="rounded-full bg-warm-sand/60 px-2.5 py-0.5 text-xs text-olive-gray">{keyword}</span>)}
              </div>
              <div className="mt-3 space-y-1.5">
                {message.metadata.plan.tasks.map((task, index) => (
                  <div key={`${task.appName}-${index}`} className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warm-sand text-xs">{index + 1}</span>
                    <span className="text-sm text-near-black">{task.appName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message.metadata?.draft && (
            <div className="mb-3 rounded-xl border border-border-cream bg-ivory/80 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-stone-gray">
                <FileText size={13} /> {message.metadata.draft.appName}
              </p>
              <h3 className="text-base font-semibold text-near-black">{message.metadata.draft.title}</h3>
            </div>
          )}

          {message.metadata?.review && (
            <div className="mb-3 rounded-xl border border-border-cream bg-ivory/80 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-stone-gray">
                <BarChart3 size={13} /> {t('workspace.reviewSummary')}
              </p>
              <p className="text-sm font-medium leading-6 text-near-black">{message.metadata.review.summary}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-white/70 p-2">
                  <p className="text-[11px] text-sage-green">{t('workspace.effective')}</p>
                  <p className="mt-1 text-xs text-olive-gray">{message.metadata.review.effectivePoints.length}</p>
                </div>
                <div className="rounded-lg bg-white/70 p-2">
                  <p className="text-[11px] text-amber-warm">Needs work</p>
                  <p className="mt-1 text-xs text-olive-gray">{message.metadata.review.ineffectivePoints.length}</p>
                </div>
                <div className="rounded-lg bg-white/70 p-2">
                  <p className="text-[11px] text-terracotta">Signals</p>
                  <p className="mt-1 text-xs text-olive-gray">{message.metadata.review.dataHighlights.length}</p>
                </div>
              </div>
            </div>
          )}

          {message.metadata?.memories && (
            <div className="mb-3 rounded-xl border border-border-cream bg-ivory/80 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-stone-gray">
                <Brain size={13} /> {t('memory.candidates')}
              </p>
              <div className="space-y-2">
                {message.metadata.memories.map((memory) => (
                  <div key={memory.id} className="rounded-lg bg-white/70 p-2">
                    <p className="text-sm text-near-black">{memory.content}</p>
                    <p className="mt-1 text-xs text-stone-gray">{memory.category}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message.type === 'cycle_complete' && (
            <div className="mb-3 rounded-xl border border-sage-green/20 bg-sage-green/10 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-sage-green">
                <Rocket size={14} /> {t('workspace.complete')}
              </p>
            </div>
          )}

          {/* 普通文本 */}
          {!isProgress && !message.metadata?.plan && !message.metadata?.review && !message.metadata?.memories && (
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
