/**
 * Centaur Loop Engine — 核心状态机
 *
 * 串联 planner → executor → reviewer → notifier，
 * 通过 switch(cycle.stage) 推进循环。
 */

import { searchAgentMemory, storeAgentMemory } from '../adapters/memory';
import { useLoopStore } from './loopStore';
import { planLoop } from './loopPlanner';
import { executeTask } from './loopExecutor';
import { reviewCycle } from './loopReviewer';
import { notifyHumanGate, scheduleReminder } from './loopNotifier';
import type {
  CentaurLoopConfig,
  HumanCheckpoint,
  LoopAdvanceContext,
  LoopCycle,
} from './types';

function generateCheckpointId(cycleId: string, type: string): string {
  return `cp-${cycleId}-${type}-${Date.now().toString(36)}`;
}

async function fetchMemories(employeeId: string, goal: string): Promise<string[]> {
  try {
    const snapshot = await searchAgentMemory(employeeId, goal, 15);
    if (Array.isArray(snapshot)) {
      return snapshot.map((m) => {
        if (typeof m === 'string') return m;
        if (m && typeof m === 'object' && 'content' in m) return String((m as unknown as Record<string, unknown>).content);
        return String(m);
      });
    }
    return [];
  } catch {
    return [];
  }
}

function getConfig(cycle: LoopCycle): CentaurLoopConfig {
  const store = useLoopStore.getState();
  const config = store.loops[cycle.loopConfigId];
  if (!config) throw new Error(`循环配置不存在：${cycle.loopConfigId}`);
  return config;
}

function getGate(config: CentaurLoopConfig, stageOrId: string) {
  return config.humanGates.find((g) => g.stage === stageOrId || g.id === stageOrId);
}

function getPreviousSuggestion(loopConfigId: string, currentCycleNumber: number): string | undefined {
  const store = useLoopStore.getState();
  const history = Object.values(store.cycles)
    .filter((c) => c.loopConfigId === loopConfigId && c.cycleNumber < currentCycleNumber)
    .sort((a, b) => b.cycleNumber - a.cycleNumber);
  return history[0]?.nextSuggestion;
}

export async function advanceLoop(
  cycleId: string,
  context: LoopAdvanceContext,
): Promise<void> {
  const store = useLoopStore.getState();
  const cycle = store.cycles[cycleId];
  if (!cycle) throw new Error(`循环实例不存在：${cycleId}`);

  const config = getConfig(cycle);

  switch (cycle.stage) {
    case 'planning': {
      const memories = await fetchMemories(cycle.employeeId, cycle.goal);
      const previousSuggestion = getPreviousSuggestion(cycle.loopConfigId, cycle.cycleNumber);

      const result = await planLoop(config, cycle.goal, {
        ownerContext: context.ownerContext,
        businessContext: context.businessContext,
        memories,
        previousSuggestion,
      });

      const tasksWithCycleId = result.tasks.map((t) => ({ ...t, cycleId }));
      store.updateCycle(cycleId, { plan: result.plan, tasks: tasksWithCycleId });

      const gate = getGate(config, 'awaiting_plan_review');
      const checkpoint: HumanCheckpoint = {
        id: generateCheckpointId(cycleId, 'plan_review'),
        cycleId,
        gateId: gate?.id ?? 'confirm-plan',
        type: 'plan_review',
        title: `确认${config.cyclePeriod === 'daily' ? '今日' : '本周'}计划`,
        detail: result.plan.summary,
        status: 'waiting',
        createdAt: new Date().toISOString(),
        remindCount: 0,
      };
      store.addCheckpoint(cycleId, checkpoint);

      if (gate) {
        notifyHumanGate(checkpoint, gate, context.pushBubble);
        scheduleReminder(cycleId, checkpoint.id, gate.remindAfterMinutes, gate, context.pushBubble);
      }

      store.updateCycle(cycleId, { stage: 'awaiting_plan_review' });
      return;
    }

    case 'awaiting_plan_review': {
      store.updateCycle(cycleId, { stage: 'generating' });
      return advanceLoop(cycleId, context);
    }

    case 'generating': {
      const freshCycle = useLoopStore.getState().cycles[cycleId];
      if (!freshCycle) return;

      const memories = await fetchMemories(freshCycle.employeeId, freshCycle.goal);

      for (const task of freshCycle.tasks) {
        if (task.status !== 'pending') continue;
        store.updateTask(cycleId, task.id, { status: 'running' });

        try {
          const draft = await executeTask(task, {
            connected: context.connected,
            ownerContext: context.ownerContext,
            businessContext: context.businessContext,
            memories,
          });
          store.updateTask(cycleId, task.id, { status: 'draft_ready', draft });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          store.updateTask(cycleId, task.id, {
            status: 'draft_ready',
            draft: {
              title: `${task.appName} — 生成失败`,
              content: `错误：${message}\n\n可以在确认区退回后重新尝试。`,
              preview: `错误：${message}`,
              generatedAt: new Date().toISOString(),
            },
          });
        }
      }

      const gate = getGate(config, 'awaiting_review');
      const checkpoint: HumanCheckpoint = {
        id: generateCheckpointId(cycleId, 'draft_review'),
        cycleId,
        gateId: gate?.id ?? 'confirm-drafts',
        type: 'draft_review',
        title: '审核内容草稿',
        detail: `共 ${freshCycle.tasks.length} 个草稿等待审核`,
        status: 'waiting',
        createdAt: new Date().toISOString(),
        remindCount: 0,
      };
      store.addCheckpoint(cycleId, checkpoint);

      if (gate) {
        notifyHumanGate(checkpoint, gate, context.pushBubble);
        scheduleReminder(cycleId, checkpoint.id, gate.remindAfterMinutes, gate, context.pushBubble);
      }

      store.updateCycle(cycleId, { stage: 'awaiting_review' });
      return;
    }

    case 'awaiting_review': {
      const freshCycle = useLoopStore.getState().cycles[cycleId];
      if (!freshCycle) return;

      const allReviewed = freshCycle.tasks.every(
        (t) => t.status === 'confirmed' || t.status === 'rejected',
      );
      if (!allReviewed) return;

      const gate = getGate(config, 'awaiting_publish');
      const checkpoint: HumanCheckpoint = {
        id: generateCheckpointId(cycleId, 'publish'),
        cycleId,
        gateId: gate?.id ?? 'publish',
        type: 'publish',
        title: '手动发布内容',
        detail: `已确认 ${freshCycle.tasks.filter((t) => t.status === 'confirmed').length} 篇内容，请手动发布`,
        status: 'waiting',
        createdAt: new Date().toISOString(),
        remindCount: 0,
      };
      store.addCheckpoint(cycleId, checkpoint);

      if (gate) {
        notifyHumanGate(checkpoint, gate, context.pushBubble);
        scheduleReminder(cycleId, checkpoint.id, gate.remindAfterMinutes, gate, context.pushBubble);
      }

      store.updateCycle(cycleId, { stage: 'awaiting_publish' });
      return;
    }

    case 'awaiting_publish': {
      const gate = getGate(config, 'awaiting_feedback');
      const checkpoint: HumanCheckpoint = {
        id: generateCheckpointId(cycleId, 'feedback'),
        cycleId,
        gateId: gate?.id ?? 'feedback',
        type: 'feedback',
        title: '补充效果反馈',
        detail: '内容已发布，请截图或填写平台数据',
        status: 'waiting',
        createdAt: new Date().toISOString(),
        remindCount: 0,
      };
      store.addCheckpoint(cycleId, checkpoint);

      if (gate) {
        scheduleReminder(cycleId, checkpoint.id, gate.remindAfterMinutes, gate, context.pushBubble);
      }

      store.updateCycle(cycleId, { stage: 'awaiting_feedback' });
      return;
    }

    case 'awaiting_feedback': {
      store.updateCycle(cycleId, { stage: 'reviewing_auto' });
      return advanceLoop(cycleId, context);
    }

    case 'reviewing_auto': {
      const freshCycle = useLoopStore.getState().cycles[cycleId];
      if (!freshCycle) return;

      const memories = await fetchMemories(freshCycle.employeeId, freshCycle.goal);

      const result = await reviewCycle(freshCycle, config, {
        ownerContext: context.ownerContext,
        businessContext: context.businessContext,
        memories,
      });

      store.updateCycle(cycleId, {
        review: result.review,
        nextSuggestion: result.nextSuggestion,
      });

      for (const candidate of result.memoryCandidates) {
        store.addMemoryCandidate(cycleId, candidate);
      }

      if (result.memoryCandidates.length > 0) {
        const gate = getGate(config, 'awaiting_memory');
        const checkpoint: HumanCheckpoint = {
          id: generateCheckpointId(cycleId, 'confirm_memory'),
          cycleId,
          gateId: gate?.id ?? 'confirm-memory',
          type: 'confirm_memory',
          title: '确认经验记忆',
          detail: `AI 提炼了 ${result.memoryCandidates.length} 条经验，请确认是否沉淀`,
          status: 'waiting',
          createdAt: new Date().toISOString(),
          remindCount: 0,
        };
        store.addCheckpoint(cycleId, checkpoint);

        if (gate) {
          notifyHumanGate(checkpoint, gate, context.pushBubble);
          scheduleReminder(cycleId, checkpoint.id, gate.remindAfterMinutes, gate, context.pushBubble);
        }

        store.updateCycle(cycleId, { stage: 'awaiting_memory' });
      } else {
        store.updateCycle(cycleId, {
          stage: 'cycle_complete',
          completedAt: new Date().toISOString(),
        });

        context.pushBubble({
          text: `${config.name} 第${freshCycle.cycleNumber}轮完成！`,
          priority: 'normal',
          emotion: 'proud',
          duration: 10000,
        });
      }
      return;
    }

    case 'awaiting_memory': {
      const freshCycle = useLoopStore.getState().cycles[cycleId];
      if (!freshCycle) return;

      for (const candidate of freshCycle.memoryCandidates) {
        if (candidate.status === 'confirmed') {
          try {
            await storeAgentMemory(freshCycle.employeeId, candidate.content, candidate.category);
          } catch {
            // 写入失败不中断
          }
        }
      }

      store.updateCycle(cycleId, {
        stage: 'cycle_complete',
        completedAt: new Date().toISOString(),
      });

      context.pushBubble({
        text: `${config.name} 第${freshCycle.cycleNumber}轮完成！`,
        priority: 'normal',
        emotion: 'proud',
        duration: 10000,
      });
      return;
    }

    case 'cycle_complete':
      return;

    default:
      return;
  }
}
