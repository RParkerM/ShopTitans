import { forwardRef } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import type { Blueprint, UserBlueprintData } from '../types';
import { BlueprintCard } from './BlueprintCard';

interface BlueprintTableProps {
  blueprints: Blueprint[];
  getUserData: (name: string) => UserBlueprintData;
  onUpdate: (name: string, patch: Partial<UserBlueprintData>) => void;
  onCardClick: (blueprint: Blueprint, tab?: 'milestones') => void;
}

const GridList = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  (props, ref) => (
    <div
      ref={ref}
      {...props}
      className="p-4 grid gap-3"
      style={{ ...props.style, gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))' }}
    />
  )
);

export function BlueprintTable({ blueprints, getUserData, onUpdate, onCardClick }: BlueprintTableProps) {
  if (blueprints.length === 0) {
    return (
      <div className="text-center text-gray-600 py-16 text-sm">
        No blueprints match your filters.
      </div>
    );
  }

  return (
    <VirtuosoGrid
      useWindowScroll
      totalCount={blueprints.length}
      overscan={600}
      components={{ List: GridList }}
      itemContent={index => {
        const bp = blueprints[index];
        return (
          <BlueprintCard
            key={bp.name}
            blueprint={bp}
            data={getUserData(bp.name)}
            onUpdate={onUpdate}
            onClick={tab => onCardClick(bp, tab)}
          />
        );
      }}
    />
  );
}
