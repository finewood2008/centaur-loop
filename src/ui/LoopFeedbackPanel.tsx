import { useState } from 'react';
import { Camera, MessageSquare, Star } from 'lucide-react';
import type { LoopCycle, QuickFeedbackInput } from '../core/types';
import ScreenshotDropZone from './ScreenshotDropZone';
import LoopMemoryPanel from './LoopMemoryPanel';

interface LoopFeedbackPanelProps {
  cycle: LoopCycle;
  onSubmitQuickFeedback: (taskId: string, data: QuickFeedbackInput) => void;
  onSubmitScreenshot: (taskId: string, base64: string) => Promise<void>;
  onConfirmMemory: (candidateId: string) => void;
  onRejectMemory: (candidateId: string) => void;
}

const RATING_OPTIONS: { value: 'good' | 'ok' | 'bad'; label: string; color: string }[] = [
  { value: 'good', label: '好', color: 'border-sage-green/30 bg-sage-green/10 text-sage-green' },
  { value: 'ok', label: '一般', color: 'border-amber-warm/30 bg-amber-warm/10 text-amber-warm' },
  { value: 'bad', label: '差', color: 'border-terracotta/30 bg-terracotta/10 text-terracotta' },
];

export default function LoopFeedbackPanel({
  cycle, onSubmitQuickFeedback, onSubmitScreenshot, onConfirmMemory, onRejectMemory,
}: LoopFeedbackPanelProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>(
    cycle.tasks.find((t) => t.status === 'confirmed' || t.status === 'published')?.id,
  );
  const [screenshotProcessing, setScreenshotProcessing] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<QuickFeedbackInput>({ published: false, rating: undefined });

  const confirmedTasks = cycle.tasks.filter(
    (t) => t.status === 'confirmed' || t.status === 'published' || t.status === 'feedback_done',
  );

  const handleScreenshot = async (base64: string) => {
    if (!activeTaskId) return;
    setScreenshotProcessing(true);
    try { await onSubmitScreenshot(activeTaskId, base64); } finally { setScreenshotProcessing(false); }
  };

  const handleSubmitForm = () => {
    if (!activeTaskId) return;
    onSubmitQuickFeedback(activeTaskId, feedbackForm);
    setFeedbackForm({ published: false, rating: undefined });
  };

  const pendingMemories = cycle.memoryCandidates.filter((mc) => mc.status === 'pending');

  return (
    <aside className="card-glass sticky top-5 h-fit space-y-4 p-4">
      <h3 className="text-sm font-semibold text-near-black">反馈与记忆</h3>

      {confirmedTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-label">选择内容</p>
          <div className="flex flex-wrap gap-1.5">
            {confirmedTasks.map((task) => (
              <button key={task.id} type="button" onClick={() => setActiveTaskId(task.id)}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  activeTaskId === task.id
                    ? 'bg-terracotta/15 text-terracotta ring-1 ring-terracotta/30'
                    : 'bg-warm-sand/50 text-olive-gray hover:bg-warm-sand'
                }`}>{task.appName}</button>
            ))}
          </div>
        </div>
      )}

      {(cycle.stage === 'awaiting_feedback' || cycle.stage === 'awaiting_publish') && (
        <div>
          <p className="text-label mb-2 flex items-center gap-1.5"><Camera size={13} /> 截图反馈</p>
          <ScreenshotDropZone onScreenshot={handleScreenshot} processing={screenshotProcessing} />
        </div>
      )}

      {(cycle.stage === 'awaiting_feedback' || cycle.stage === 'awaiting_publish') && (
        <div className="space-y-3">
          <p className="text-label flex items-center gap-1.5"><MessageSquare size={13} /> 快速反馈</p>
          <label className="flex items-center gap-2 text-sm text-near-black">
            <input type="checkbox" checked={feedbackForm.published}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, published: e.target.checked })}
              className="rounded border-border-cream" /> 已发布
          </label>
          {feedbackForm.published && (
            <input type="text" placeholder="发布平台（公众号/小红书/抖音…）"
              value={feedbackForm.platform ?? ''}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, platform: e.target.value })}
              className="w-full rounded-xl border border-border-cream bg-ivory px-3 py-2 text-sm outline-none focus:border-terracotta/40" />
          )}
          <div>
            <p className="text-label mb-1.5 flex items-center gap-1.5"><Star size={13} /> 效果评价</p>
            <div className="flex gap-2">
              {RATING_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setFeedbackForm({ ...feedbackForm, rating: opt.value })}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    feedbackForm.rating === opt.value ? opt.color : 'border-border-cream bg-ivory text-olive-gray'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['views', 'likes', 'favorites', 'comments'] as const).map((key) => (
              <input key={key} type="number"
                placeholder={{ views: '阅读量', likes: '点赞', favorites: '收藏', comments: '评论' }[key]}
                value={feedbackForm[key] ?? ''}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, [key]: e.target.value ? Number(e.target.value) : undefined })}
                className="rounded-xl border border-border-cream bg-ivory px-3 py-2 text-sm outline-none focus:border-terracotta/40" />
            ))}
          </div>
          <textarea placeholder="补充说明（可选）" value={feedbackForm.ownerNote ?? ''}
            onChange={(e) => setFeedbackForm({ ...feedbackForm, ownerNote: e.target.value })}
            rows={2}
            className="w-full resize-none rounded-xl border border-border-cream bg-ivory px-3 py-2 text-sm outline-none focus:border-terracotta/40" />
          <button type="button" onClick={handleSubmitForm} disabled={!activeTaskId}
            className="btn-terracotta w-full justify-center text-sm disabled:opacity-40">提交反馈</button>
        </div>
      )}

      {pendingMemories.length > 0 && (
        <LoopMemoryPanel candidates={pendingMemories} onConfirm={onConfirmMemory} onReject={onRejectMemory} />
      )}
    </aside>
  );
}
