import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Edit3, Eye, X } from 'lucide-react';
import type { LoopTask } from '../core/types';

interface LoopDraftCardProps {
  task: LoopTask;
  onApprove: () => void;
  onReject: (note: string) => void;
  onViewFull: () => void;
}

const ARTIFACT_LABEL: Record<string, string> = {
  article: '公众号',
  social_post: '社交帖',
  video_script: '视频脚本',
  seo_article: 'SEO 文章',
  geo_content: 'GEO 内容',
  content_plan: '内容计划',
  review_report: '复盘报告',
};

export default function LoopDraftCard({ task, onApprove, onReject, onViewFull }: LoopDraftCardProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [expanded, setExpanded] = useState(false);

  const isConfirmed = task.status === 'confirmed';
  const isRejected = task.status === 'rejected';
  const isReviewed = isConfirmed || isRejected;

  return (
    <article className={`rounded-2xl border p-4 transition-shadow ${
      isConfirmed ? 'border-sage-green/30 bg-sage-green/5'
        : isRejected ? 'border-terracotta/20 bg-terracotta/5'
        : 'border-border-cream bg-white/70 hover:shadow-sm'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="badge">{task.appName}</span>
            <span className="rounded-full bg-warm-sand/60 px-2 py-0.5 text-xs text-olive-gray">
              {ARTIFACT_LABEL[task.artifactType] ?? task.artifactType}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-near-black">
            {task.draft?.title ?? `${task.appName} · 草稿`}
          </h3>
        </div>
        {isConfirmed && <span className="flex items-center gap-1 text-xs text-sage-green"><Check size={14} /> 已确认</span>}
        {isRejected && <span className="flex items-center gap-1 text-xs text-terracotta"><X size={14} /> 已退回</span>}
      </div>

      {task.draft && (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-olive-gray">
            {expanded ? task.draft.content : task.draft.preview}
          </p>
          {task.draft.content.length > 200 && (
            <button type="button" onClick={() => setExpanded(!expanded)}
              className="mt-1 flex items-center gap-1 text-xs text-terracotta hover:underline">
              {expanded ? <><ChevronUp size={12} /> 收起</> : <><ChevronDown size={12} /> 展开全文</>}
            </button>
          )}
        </div>
      )}

      {isRejected && task.confirmation?.note && (
        <div className="mt-3 rounded-xl border border-terracotta/15 bg-terracotta/5 p-3">
          <p className="text-xs text-stone-gray">退回意见</p>
          <p className="mt-1 text-sm text-near-black">{task.confirmation.note}</p>
        </div>
      )}

      {!isReviewed && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onViewFull} className="btn-ghost text-xs"><Eye size={13} /> 查看全文</button>
          <button type="button" onClick={onApprove} className="btn-terracotta text-xs px-3 py-1.5"><Check size={13} /> 确认</button>
          <button type="button" onClick={() => setRejectOpen(!rejectOpen)} className="btn-ghost text-xs"><Edit3 size={13} /> 修改意见</button>
        </div>
      )}

      {rejectOpen && !isReviewed && (
        <div className="mt-3 space-y-2">
          <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
            placeholder="请说明需要修改的地方…" rows={2}
            className="w-full resize-none rounded-xl border border-border-cream bg-ivory px-3 py-2 text-sm text-near-black outline-none focus:border-terracotta/40" />
          <div className="flex gap-2">
            <button type="button" disabled={!rejectNote.trim()}
              onClick={() => { onReject(rejectNote.trim()); setRejectOpen(false); setRejectNote(''); }}
              className="btn-terracotta text-xs px-3 py-1.5 disabled:opacity-40">提交退回</button>
            <button type="button" onClick={() => { setRejectOpen(false); setRejectNote(''); }}
              className="btn-ghost text-xs">取消</button>
          </div>
        </div>
      )}
    </article>
  );
}
