/**
 * Centaur Loop Engine — Zustand Store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CentaurLoopConfig,
  HumanCheckpoint,
  LoopCycle,
  LoopStore,
  LoopTask,
  MemoryCandidate,
} from './types';

function generateCycleId(loopConfigId: string): string {
  return `${loopConfigId}-${Date.now().toString(36)}`;
}

export const useLoopStore = create<LoopStore>()(
  persist(
    (set, get) => ({
      loops: {},
      cycles: {},
      activeCycleIds: {},
      pendingCheckpointCount: 0,
      homeCardCheckpoints: [],

      registerLoop: (config: CentaurLoopConfig) => {
        set((s) => ({
          loops: { ...s.loops, [config.id]: config },
        }));
      },

      startCycle: (loopConfigId: string, goal: string, goalSource: 'manual' | 'ai_suggest'): string => {
        const state = get();
        const config = state.loops[loopConfigId];
        if (!config) {
          throw new Error(`Loop config not found: ${loopConfigId}`);
        }

        const history = Object.values(state.cycles)
          .filter((c) => c.loopConfigId === loopConfigId)
          .sort((a, b) => b.cycleNumber - a.cycleNumber);
        const nextNumber = history.length > 0 ? history[0].cycleNumber + 1 : 1;

        const cycleId = generateCycleId(loopConfigId);
        const cycle: LoopCycle = {
          id: cycleId,
          loopConfigId,
          employeeId: config.employeeId,
          stage: 'planning',
          cycleNumber: nextNumber,
          goal,
          goalSource,
          tasks: [],
          memoryCandidates: [],
          checkpoints: [],
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          cycles: { ...s.cycles, [cycleId]: cycle },
          activeCycleIds: { ...s.activeCycleIds, [loopConfigId]: cycleId },
        }));

        return cycleId;
      },

      updateCycle: (cycleId: string, updates: Partial<LoopCycle>) => {
        set((s) => {
          const existing = s.cycles[cycleId];
          if (!existing) return s;
          return {
            cycles: { ...s.cycles, [cycleId]: { ...existing, ...updates } },
          };
        });
      },

      updateTask: (cycleId: string, taskId: string, updates: Partial<LoopTask>) => {
        set((s) => {
          const cycle = s.cycles[cycleId];
          if (!cycle) return s;
          return {
            cycles: {
              ...s.cycles,
              [cycleId]: {
                ...cycle,
                tasks: cycle.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
              },
            },
          };
        });
      },

      addTask: (cycleId: string, task: LoopTask) => {
        set((s) => {
          const cycle = s.cycles[cycleId];
          if (!cycle) return s;
          return {
            cycles: {
              ...s.cycles,
              [cycleId]: { ...cycle, tasks: [...cycle.tasks, task] },
            },
          };
        });
      },

      addCheckpoint: (cycleId: string, checkpoint: HumanCheckpoint) => {
        set((s) => {
          const cycle = s.cycles[cycleId];
          if (!cycle) return s;
          return {
            cycles: {
              ...s.cycles,
              [cycleId]: { ...cycle, checkpoints: [...cycle.checkpoints, checkpoint] },
            },
          };
        });
        get().recalcPendingCount();
      },

      resolveCheckpoint: (cycleId: string, checkpointId: string) => {
        set((s) => {
          const cycle = s.cycles[cycleId];
          if (!cycle) return s;
          return {
            cycles: {
              ...s.cycles,
              [cycleId]: {
                ...cycle,
                checkpoints: cycle.checkpoints.map((cp) =>
                  cp.id === checkpointId
                    ? { ...cp, status: 'done' as const, resolvedAt: new Date().toISOString() }
                    : cp,
                ),
              },
            },
          };
        });
        get().recalcPendingCount();
      },

      addMemoryCandidate: (cycleId: string, candidate: MemoryCandidate) => {
        set((s) => {
          const cycle = s.cycles[cycleId];
          if (!cycle) return s;
          return {
            cycles: {
              ...s.cycles,
              [cycleId]: { ...cycle, memoryCandidates: [...cycle.memoryCandidates, candidate] },
            },
          };
        });
      },

      confirmMemory: (cycleId: string, candidateId: string) => {
        set((s) => {
          const cycle = s.cycles[cycleId];
          if (!cycle) return s;
          return {
            cycles: {
              ...s.cycles,
              [cycleId]: {
                ...cycle,
                memoryCandidates: cycle.memoryCandidates.map((mc) =>
                  mc.id === candidateId ? { ...mc, status: 'confirmed' as const } : mc,
                ),
              },
            },
          };
        });
      },

      rejectMemory: (cycleId: string, candidateId: string) => {
        set((s) => {
          const cycle = s.cycles[cycleId];
          if (!cycle) return s;
          return {
            cycles: {
              ...s.cycles,
              [cycleId]: {
                ...cycle,
                memoryCandidates: cycle.memoryCandidates.map((mc) =>
                  mc.id === candidateId ? { ...mc, status: 'rejected' as const } : mc,
                ),
              },
            },
          };
        });
      },

      getActiveCycle: (loopConfigId: string): LoopCycle | null => {
        const state = get();
        const cycleId = state.activeCycleIds[loopConfigId];
        if (!cycleId) return null;
        return state.cycles[cycleId] ?? null;
      },

      getCycleHistory: (loopConfigId: string): LoopCycle[] => {
        const state = get();
        return Object.values(state.cycles)
          .filter((c) => c.loopConfigId === loopConfigId)
          .sort((a, b) => b.cycleNumber - a.cycleNumber);
      },

      recalcPendingCount: () => {
        const state = get();
        const activeIds = Object.values(state.activeCycleIds);
        const allWaiting: HumanCheckpoint[] = [];
        for (const cycleId of activeIds) {
          const cycle = state.cycles[cycleId];
          if (!cycle) continue;
          for (const cp of cycle.checkpoints) {
            if (cp.status === 'waiting') allWaiting.push(cp);
          }
        }
        set({
          pendingCheckpointCount: allWaiting.length,
          homeCardCheckpoints: allWaiting,
        });
      },
    }),
    {
      name: 'centaur_loop_engine',
      partialize: (state) => ({
        loops: state.loops,
        cycles: state.cycles,
        activeCycleIds: state.activeCycleIds,
        pendingCheckpointCount: state.pendingCheckpointCount,
        homeCardCheckpoints: state.homeCardCheckpoints,
      }),
    },
  ),
);
