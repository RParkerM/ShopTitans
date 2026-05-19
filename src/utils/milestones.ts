import type { Milestone } from '../types';

export interface MilestoneStatus {
  completed: number;
  total: number;
  allComplete: boolean;
  craftsToNext: number;
  nextReward: string | null;
}

export function getMilestoneStatus(craftCount: number, milestones: Milestone[]): MilestoneStatus {
  if (milestones.length === 0) {
    return { completed: 0, total: 0, allComplete: true, craftsToNext: 0, nextReward: null };
  }

  const completed = milestones.filter(m => m.craftsNeeded > 0 && craftCount >= m.craftsNeeded).length;
  const allComplete = completed === milestones.length;
  const next = milestones[completed];

  return {
    completed,
    total: milestones.length,
    allComplete,
    craftsToNext: next ? Math.max(0, next.craftsNeeded - craftCount) : 0,
    nextReward: next ? next.reward : null,
  };
}
