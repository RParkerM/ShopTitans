import type { Blueprint, UserBlueprintData } from '../types';
import { BlueprintRow } from './BlueprintRow';

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
    <div>
      {blueprints.map(bp => (
        <BlueprintRow
          key={bp.name}
          blueprint={bp}
          data={getUserData(bp.name)}
          onUpdate={patch => onUpdate(bp.name, patch)}
        />
      ))}
    </div>
  );
}
