import type { Blueprint, UserBlueprintData } from '../types';
import { BlueprintCard } from './BlueprintCard';

interface BlueprintTableProps {
  blueprints: Blueprint[];
  getUserData: (name: string) => UserBlueprintData;
  onUpdate: (name: string, patch: Partial<UserBlueprintData>) => void;
}

export function BlueprintTable({ blueprints, getUserData, onUpdate }: BlueprintTableProps) {
  if (blueprints.length === 0) {
    return (
      <div className="text-center text-gray-600 py-16 text-sm">
        No blueprints match your filters.
      </div>
    );
  }

  return (
    <div className="p-4 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))' }}>
      {blueprints.map(bp => (
        <BlueprintCard
          key={bp.name}
          blueprint={bp}
          data={getUserData(bp.name)}
          onUpdate={patch => onUpdate(bp.name, patch)}
        />
      ))}
    </div>
  );
}
