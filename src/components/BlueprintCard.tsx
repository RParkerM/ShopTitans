import { useState } from 'react';
import type { Blueprint, UserBlueprintData } from '../types';
import { MilestoneProgress } from './MilestoneProgress';
import { getBlueprintImages } from '../utils/blueprintImages';

interface BlueprintCardProps {
  blueprint: Blueprint;
  data: UserBlueprintData;
  onUpdate: (patch: Partial<UserBlueprintData>) => void;
}

function AscensionStars({ level, onChange }: { level: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5" title={`Ascension: ${level}/3`}>
      {[1, 2, 3].map(star => (
        <button
          key={star}
          onClick={() => onChange(level === star ? star - 1 : star)}
          className={`text-xs leading-none transition-colors ${
            star <= level ? 'text-amber-400 hover:text-amber-300' : 'text-gray-700 hover:text-gray-500'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function TierBadge({ tier }: { tier: number }) {
  const colors =
    tier >= 13 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
    tier >= 10 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
    tier >= 7  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
    tier >= 4  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors}`}>
      T{tier}
    </span>
  );
}

export function BlueprintCard({ blueprint, data, onUpdate }: BlueprintCardProps) {
  const { name, type, tier, craftingMilestones, starforgedMilestones } = blueprint;
  const { owned, starforged, ascensionLevel, craftCount } = data;
  const [imgError, setImgError] = useState(false);

  const { circleBackground, itemImage } = getBlueprintImages(name, type, tier);

  const lastCraftingThreshold = craftingMilestones.length > 0
    ? craftingMilestones[craftingMilestones.length - 1].craftsNeeded
    : 0;
  const sfCraftCount = Math.max(0, craftCount - lastCraftingThreshold);

  const hasMilestones = craftingMilestones.length > 0 || (starforged && starforgedMilestones.length > 0);

  return (
    <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 transition-opacity ${!owned ? 'opacity-50' : ''}`}>
      {/* Image area */}
      <div className="relative flex items-center justify-center bg-gray-900 py-4">
        {/* Circle background */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <img
            src={circleBackground}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
          {/* Item image */}
          {itemImage && !imgError ? (
            <img
              src={itemImage}
              alt={name}
              className="relative z-10 w-14 h-14 object-contain drop-shadow-lg"
              onError={() => setImgError(true)}
              draggable={false}
            />
          ) : (
            <span className="relative z-10 text-2xl text-gray-500 select-none">
              {type[0] ?? '?'}
            </span>
          )}
        </div>
        {/* Tier badge — top right */}
        <div className="absolute top-2 right-2">
          <TierBadge tier={tier} />
        </div>
      </div>

      {/* Name + type */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-white text-sm font-semibold leading-tight truncate" title={name}>{name}</p>
        <p className="text-gray-500 text-xs mt-0.5">{type}</p>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-gray-700/50 mt-auto">
        {/* Owned */}
        <label className="flex items-center gap-1 cursor-pointer select-none" title="Owned">
          <input
            type="checkbox"
            checked={owned}
            onChange={e => onUpdate({ owned: e.target.checked })}
            className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
          />
          <span className="text-xs text-gray-400">Own</span>
        </label>

        {/* Starforged */}
        <label className="flex items-center gap-1 cursor-pointer select-none" title="Starforged">
          <input
            type="checkbox"
            checked={starforged}
            onChange={e => onUpdate({ starforged: e.target.checked })}
            className="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
          />
          <span className={`text-xs ${starforged ? 'text-purple-400' : 'text-gray-500'}`}>SF</span>
        </label>

        {/* Ascension */}
        <AscensionStars level={ascensionLevel} onChange={v => onUpdate({ ascensionLevel: v })} />

        {/* Craft count */}
        <input
          type="number"
          min={0}
          value={craftCount === 0 ? '' : craftCount}
          placeholder="0"
          onChange={e => onUpdate({ craftCount: Math.max(0, parseInt(e.target.value) || 0) })}
          className="ml-auto w-14 px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-white text-right focus:outline-none focus:border-amber-500"
          title="Total crafts"
        />
      </div>

      {/* Milestones */}
      {hasMilestones && (
        <div className="px-3 pb-2.5 flex flex-col gap-1 border-t border-gray-700/50 pt-2">
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
              craftCount={sfCraftCount}
              accent="purple"
            />
          )}
        </div>
      )}
    </div>
  );
}
