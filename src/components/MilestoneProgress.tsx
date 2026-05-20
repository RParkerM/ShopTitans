import { getMilestoneStatus } from '../utils/milestones';
import type { Milestone } from '../types';

interface MilestoneProgressProps {
  label: string;
  milestones: Milestone[];
  craftCount: number;
  accent?: 'amber' | 'purple';
}

export function MilestoneProgress({ label, milestones, craftCount, accent = 'amber' }: MilestoneProgressProps) {
  if (milestones.length === 0) return null;

  const status = getMilestoneStatus(craftCount, milestones);
  const filledColor = accent === 'purple' ? 'bg-purple-500' : 'bg-amber-500';

  return (
    <div className="flex items-center gap-2 text-xs min-w-0">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <div className="flex gap-0.5 shrink-0">
        {milestones.map((m, i) => (
          <div
            key={i}
            title={`${m.reward} (${m.craftsNeeded} crafts)`}
            className={`h-2 w-5 rounded-sm ${i < status.completed ? filledColor : 'bg-gray-700'}`}
          />
        ))}
      </div>
      <span className="text-gray-400 shrink-0">
        {status.completed}/{status.total}
      </span>
      {!status.allComplete && status.craftsToNext > 0 && (
        <span className="text-gray-500 truncate">
          · {status.craftsToNext} to next
          {status.nextReward && (
            <span className="text-gray-600"> ({status.nextReward})</span>
          )}
        </span>
      )}
      {status.allComplete && (
        <span className={accent === 'purple' ? 'text-purple-400' : 'text-amber-400'}>✓ Complete</span>
      )}
    </div>
  );
}
