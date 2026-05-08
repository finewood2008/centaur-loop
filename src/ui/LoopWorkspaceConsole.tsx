/**
 * LoopWorkspaceConsole — 闭环工作间三栏壳层（独立版）
 */

import { useCallback, useState } from 'react';
import { Activity, ClipboardCheck, PlugZap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { QuickFeedbackInput, SpiritBubblePayload } from '../core/types';
import { useLoopStore } from '../core/loopStore';
import { advanceLoop } from '../core/loopEngine';
import { submitQuickFeedback, processScreenshotFeedback } from '../core/feedbackCollector';
import { ALL_LOOP_CONFIGS } from '../core/loopConfigs';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useI18n, getOutputLanguageInstruction } from '../i18n';
import type { RuntimeConnector, RuntimeStatus } from '../adapters/runtime';
import LoopProgressSidebar from './LoopProgressSidebar';
import LoopWorkspaceMain from './LoopWorkspaceMain';
import LoopFeedbackPanel from './LoopFeedbackPanel';

interface LoopWorkspaceConsoleProps {
  runtimeStatus: RuntimeStatus;
}

function noop(_bubble: SpiritBubblePayload) {
  // 气泡提醒暂不实现，后续接入 toast 系统
  console.log('[Loop Bubble]', _bubble.text);
}

function RuntimeCard({ status }: { status: RuntimeStatus & { connectors?: RuntimeConnector[] } }) {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-border-cream bg-ivory/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-near-black">
          <Activity size={15} className={status.mode === 'real' ? 'text-sage-green' : 'text-amber-warm'} />
          {t('runtime.title')}
        </h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${
          status.mode === 'real' ? 'bg-sage-green/15 text-sage-green' : 'bg-amber-warm/15 text-amber-warm'
        }`}>
          {status.mode === 'real' ? t('runtime.real') : t('runtime.demo')}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-olive-gray">
        {status.mode === 'real' ? t('runtime.available') : t('runtime.unavailable')}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/70 p-2">
          <p className="text-stone-gray">{t('runtime.provider')}</p>
          <p className="mt-1 font-medium text-near-black">{status.provider}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2">
          <p className="text-stone-gray">{t('runtime.model')}</p>
          <p className="mt-1 font-medium text-near-black">{status.model}</p>
        </div>
      </div>
      <div className="mt-3 border-t border-border-cream pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-stone-gray">
          <PlugZap size={13} /> {t('runtime.adapters')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(status.connectors ?? []).map((connector) => (
            <span key={connector.id} className={`rounded-full px-2 py-0.5 text-[11px] ${
              connector.available
                ? 'bg-sage-green/10 text-sage-green'
                : 'bg-warm-sand/60 text-olive-gray'
            }`}>
              {connector.label}{!connector.available ? ` · ${t('runtime.planned')}` : ''}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LoopWorkspaceConsole({ runtimeStatus }: LoopWorkspaceConsoleProps) {
  const { t, locale } = useI18n();
  const isXl = useMediaQuery('(min-width: 1280px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [activeConfigId, setActiveConfigId] = useState(ALL_LOOP_CONFIGS[0]?.id ?? '');

  const store = useLoopStore();
  const config = store.loops[activeConfigId] ?? ALL_LOOP_CONFIGS.find((c) => c.id === activeConfigId);
  const cycle = store.getActiveCycle(activeConfigId);
  const history = store.getCycleHistory(activeConfigId).filter((c) => c.stage === 'cycle_complete');

  const advanceContext = {
    connected: true, // 独立版 demo 模式始终"已连接"
    ownerContext: '',
    businessContext: '',
    outputLanguage: getOutputLanguageInstruction(locale),
    pushBubble: noop,
  };

  const doAdvance = useCallback(async (cycleId: string) => {
    setAdvancing(true);
    try {
      await advanceLoop(cycleId, advanceContext);
    } catch (error) {
      console.error('闭环推进失败：', error);
    } finally {
      setAdvancing(false);
    }
  }, []);

  const handleStartCycle = useCallback(async (goal: string) => {
    if (!config) return;
    const cycleId = store.startCycle(activeConfigId, goal, 'manual');
    await doAdvance(cycleId);
  }, [activeConfigId, config, store, doAdvance]);

  const handleConfirmPlan = useCallback(async () => {
    if (!cycle) return;
    const planCp = cycle.checkpoints.find((cp) => cp.type === 'plan_review' && cp.status === 'waiting');
    if (planCp) store.resolveCheckpoint(cycle.id, planCp.id);
    await doAdvance(cycle.id);
  }, [cycle, store, doAdvance]);

  const handleApproveDraft = useCallback((taskId: string) => {
    if (!cycle) return;
    store.updateTask(cycle.id, taskId, {
      status: 'confirmed',
      confirmation: { status: 'approved', confirmedAt: new Date().toISOString() },
    });
  }, [cycle, store]);

  const handleRejectDraft = useCallback((taskId: string, note: string) => {
    if (!cycle) return;
    store.updateTask(cycle.id, taskId, {
      status: 'rejected',
      confirmation: { status: 'rejected', note, confirmedAt: new Date().toISOString() },
    });
  }, [cycle, store]);

  const handleConfirmAllDrafts = useCallback(() => {
    if (!cycle) return;
    for (const task of cycle.tasks) {
      if (task.status === 'draft_ready') {
        store.updateTask(cycle.id, task.id, {
          status: 'confirmed',
          confirmation: { status: 'approved', confirmedAt: new Date().toISOString() },
        });
      }
    }
  }, [cycle, store]);

  const handleMarkPublished = useCallback((taskId: string, platform: string) => {
    if (!cycle) return;
    store.updateTask(cycle.id, taskId, {
      status: 'published',
      publish: { published: true, platform, publishedAt: new Date().toISOString() },
    });
  }, [cycle, store]);

  const handleMarkAllPublished = useCallback(() => {
    if (!cycle) return;
    for (const task of cycle.tasks) {
      if (task.status === 'confirmed' && !task.publish?.published) {
        store.updateTask(cycle.id, task.id, {
          status: 'published',
          publish: { published: true, publishedAt: new Date().toISOString() },
        });
      }
    }
  }, [cycle, store]);

  const handleSubmitQuickFeedback = useCallback((taskId: string, data: QuickFeedbackInput) => {
    if (!cycle) return;
    const feedback = submitQuickFeedback(taskId, cycle.id, data);
    store.updateTask(cycle.id, taskId, { feedback, status: 'feedback_done' });
  }, [cycle, store]);

  const handleSubmitScreenshot = useCallback(async (taskId: string, base64: string) => {
    if (!cycle) return;
    const feedback = await processScreenshotFeedback(taskId, cycle.id, base64);
    store.updateTask(cycle.id, taskId, { feedback, status: 'feedback_done' });
  }, [cycle, store]);

  const handleSubmitAllFeedback = useCallback(async () => {
    if (!cycle) return;
    const fbCp = cycle.checkpoints.find((cp) => cp.type === 'feedback' && cp.status === 'waiting');
    if (fbCp) store.resolveCheckpoint(cycle.id, fbCp.id);
    await doAdvance(cycle.id);
  }, [cycle, store, doAdvance]);

  const handleConfirmMemory = useCallback((candidateId: string) => {
    if (!cycle) return;
    store.confirmMemory(cycle.id, candidateId);
  }, [cycle, store]);

  const handleRejectMemory = useCallback((candidateId: string) => {
    if (!cycle) return;
    store.rejectMemory(cycle.id, candidateId);
  }, [cycle, store]);

  const handleConfirmAllMemory = useCallback(async () => {
    if (!cycle) return;
    const memCp = cycle.checkpoints.find((cp) => cp.type === 'confirm_memory' && cp.status === 'waiting');
    if (memCp) store.resolveCheckpoint(cycle.id, memCp.id);
    await doAdvance(cycle.id);
  }, [cycle, store, doAdvance]);

  const handleAdvance = useCallback(async () => {
    if (!cycle) return;
    const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
    if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
    await doAdvance(cycle.id);
  }, [cycle, store, doAdvance]);

  if (!config) {
    return <div className="text-center text-sm text-stone-gray py-12">未找到闭环配置</div>;
  }

  const pendingCount = cycle
    ? cycle.checkpoints.filter((cp) => cp.status === 'waiting').length
    : 0;

  return (
    <div>
      {/* 三栏布局 */}
      <div className={
        isXl
          ? 'grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_340px]'
          : 'grid gap-4 grid-cols-[minmax(0,1fr)]'
      }>
        {isXl && (
          <LoopProgressSidebar
            cycle={cycle}
            config={config}
            allConfigs={ALL_LOOP_CONFIGS}
            activeConfigId={activeConfigId}
            onSwitchConfig={setActiveConfigId}
          />
        )}

        <main className="min-w-0">
          <LoopWorkspaceMain
            cycle={cycle}
            config={config}
            history={history}
            advancing={advancing}
            onStartCycle={handleStartCycle}
            onConfirmPlan={handleConfirmPlan}
            onApproveDraft={handleApproveDraft}
            onRejectDraft={handleRejectDraft}
            onConfirmAllDrafts={handleConfirmAllDrafts}
            onMarkPublished={handleMarkPublished}
            onMarkAllPublished={handleMarkAllPublished}
            onSubmitQuickFeedback={handleSubmitQuickFeedback}
            onSubmitAllFeedback={handleSubmitAllFeedback}
            onConfirmMemory={handleConfirmMemory}
            onRejectMemory={handleRejectMemory}
            onConfirmAllMemory={handleConfirmAllMemory}
            onAdvance={handleAdvance}
          />
        </main>

        {isXl && cycle && (
          <aside className="sticky top-5 h-fit space-y-4">
            <RuntimeCard status={runtimeStatus} />
            <LoopFeedbackPanel
              cycle={cycle}
              onSubmitQuickFeedback={handleSubmitQuickFeedback}
              onSubmitScreenshot={handleSubmitScreenshot}
              onConfirmMemory={handleConfirmMemory}
              onRejectMemory={handleRejectMemory}
            />
          </aside>
        )}

        {isXl && !cycle && (
          <aside className="sticky top-5 h-fit space-y-4">
            <RuntimeCard status={runtimeStatus} />
            <LoopFeedbackPanel
              cycle={null}
              onSubmitQuickFeedback={handleSubmitQuickFeedback}
              onSubmitScreenshot={handleSubmitScreenshot}
              onConfirmMemory={handleConfirmMemory}
              onRejectMemory={handleRejectMemory}
            />
          </aside>
        )}
      </div>

      {/* < xl 浮动按钮 + Drawer */}
      {!isXl && cycle && (
        <>
          <button type="button" onClick={() => setDrawerOpen((p) => !p)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-border-cream bg-parchment px-4 py-3 shadow-lg transition hover:bg-ivory">
            <ClipboardCheck size={18} className="text-terracotta" />
            <span className="text-sm font-medium text-near-black">{t('feedback.drawer')}</span>
            {pendingCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-terracotta px-1.5 text-xs font-medium text-ivory">
                {pendingCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {drawerOpen && (
              <motion.div key="fb-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }} className="fixed inset-0 z-40 bg-near-black/25"
                onClick={() => setDrawerOpen(false)} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {drawerOpen && (
              <motion.div key="fb-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed right-0 top-0 z-40 h-full w-[380px] max-w-[90vw] overflow-y-auto bg-parchment shadow-2xl">
                <div className="flex items-center justify-between border-b border-border-cream bg-ivory/80 px-4 py-3">
                  <span className="text-sm font-medium text-near-black">{t('feedback.title')}</span>
                  <button type="button" onClick={() => setDrawerOpen(false)} className="btn-ghost px-2 py-1 text-xs">{t('feedback.close')}</button>
                </div>
                <div className="p-0">
                  <LoopFeedbackPanel
                    cycle={cycle}
                    onSubmitQuickFeedback={handleSubmitQuickFeedback}
                    onSubmitScreenshot={handleSubmitScreenshot}
                    onConfirmMemory={handleConfirmMemory}
                    onRejectMemory={handleRejectMemory}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
