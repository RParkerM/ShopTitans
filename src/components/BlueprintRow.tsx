import type { Blueprint, UserBlueprintData } from '../types';
import { MilestoneProgress } from './MilestoneProgress';

interface BlueprintRowProps {
  blueprint: Blueprint;
  data: UserBlueprintData;
  onUpdate: (patch: Partial<UserBlueprintData>) => void;
}

function AscensionStars({ level, onChange }: { level: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5 shrink-0" title={`Ascension: ${level}/3`}>
      {[1, 2, 3].map(star => (
        <button
          key={star}
          onClick={() => onChange(level === star ? star - 1 : star)}
          className={`text-sm leading-none transition-colors ${
            star <= level ? 'text-amber-400 hover:text-amber-300' : 'text-gray-700 hover:text-gray-500'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function BlueprintRow({ blueprint, data, onUpdate }: BlueprintRowProps) {
  const { name, type, tier, craftingMilestones, starforgedMilestones } = blueprint;
  const { owned, starforged, ascensionLevel, craftCount } = data;

  const hasMilestones = craftingMilestones.length > 0 || (starforged && starforgedMilestones.length > 0);

  return (
    <div className={`border-b border-gray-800 px-4 py-2.5 hover:bg-gray-800/40 transition-colors ${!owned ? 'opacity-50' : ''}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Owned */}
        <input
          type="checkbox"
          checked={owned}
          onChange={e => onUpdate({ owned: e.target.checked })}
          className="accent-amber-500 w-4 h-4 shrink-0 cursor-pointer"
          title="Owned"
        />

        {/* Name */}
        <span className="text-white text-sm font-medium flex-1 min-w-[140px]">{name}</span>

        {/* Tier + Type */}
        <span className="text-gray-600 text-xs bg-gray-800 rounded px-1.5 py-0.5 shrink-0">T{tier}</span>
        <span className="text-gray-500 text-xs w-20 shrink-0">{type}</span>

        {/* Starforged */}
        <label className="flex items-center gap-1 cursor-pointer shrink-0 select-none" title="Starforged">
          <input
            type="checkbox"
            checked={starforged}
            onChange={e => onUpdate({ starforged: e.target.checked })}
            className="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
          />
          <span className={`text-xs ${starforged ? 'text-purple-400' : 'text-gray-600'}`}>SF</span>
        </label>

        {/* Ascension stars */}
        <AscensionStars level={ascensionLevel} onChange={v => onUpdate({ ascensionLevel: v })} />

        {/* Craft count */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-gray-600 text-xs">Crafts</span>
          <input
            type="number"
            min={0}
            value={craftCount === 0 ? '' : craftCount}
            placeholder="0"
            onChange={e => onUpdate({ craftCount: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-16 px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-white text-right focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Milestone row — crafting and starforged side by side */}
      {hasMilestones && (
        <div className="mt-1.5 ml-7 flex flex-wrap gap-x-6 gap-y-1">
          {craftingMilestones.length > 0 && (
            <MilestoneProgress
              label="Crafting"
              milestones={craftingMilestones}
              craftCount={craftCount}
              accent="amber"
            />
          )}
          {starforged && starforgedMilestones.length > 0 && (
            <MilestoneProgress
              label="Starforged"
              milestones={starforgedMilestones}
              craftCount={craftCount}
              accent="purple"
            />
          )}
        </div>
      )}
    </div>
  );
}
