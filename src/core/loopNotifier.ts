/**
 * Centaur Loop Engine — 提醒系统
 */

import type { HumanCheckpoint, HumanGateConfig, SpiritBubblePayload } from './types';
import { useLoopStore } from './loopStore';

type PushBubbleFn = (bubble: SpiritBubblePayload) => void;

export function notifyHumanGate(
  checkpoint: HumanCheckpoint,
  gate: HumanGateConfig,
  pushBubble: PushBubbleFn,
): void {
  for (const channel of gate.notifyChannels) {
    switch (channel) {
      case 'spirit_bubble':
        pushBubble({
          text: `${gate.name}：${checkpoint.title}`,
          priority: gate.required ? 'high' : 'normal',
          emotion: gate.required ? 'concerned' : 'neutral',
          duration: 8000,
        });
        break;
      case 'badge':
      case 'home_card':
        useLoopStore.getState().recalcPendingCount();
        break;
      case 'chat_followup':
        pushBubble({
          text: `还有事情等你处理：${checkpoint.title}`,
          priority: 'normal',
          emotion: 'concerned',
          duration: 10000,
        });
        break;
    }
  }
}

export function scheduleReminder(
  cycleId: string,
  checkpointId: string,
  delayMinutes: number,
  gate: HumanGateConfig,
  pushBubble: PushBubbleFn,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    const state = useLoopStore.getState();
    const cycle = state.cycles[cycleId];
    if (!cycle) return;

    const checkpoint = cycle.checkpoints.find((cp) => cp.id === checkpointId);
    if (!checkpoint || checkpoint.status !== 'waiting') return;
    if (checkpoint.remindCount >= gate.maxReminders) return;

    state.updateCycle(cycleId, {
      checkpoints: cycle.checkpoints.map((cp) =>
        cp.id === checkpointId
          ? { ...cp, remindCount: cp.remindCount + 1 }
          : cp,
      ),
    });

    notifyHumanGate(
      { ...checkpoint, remindCount: checkpoint.remindCount + 1 },
      gate,
      pushBubble,
    );

    scheduleReminder(cycleId, checkpointId, delayMinutes, gate, pushBubble);
  }, delayMinutes * 60 * 1000);
}
