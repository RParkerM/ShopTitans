import { memo, useState } from 'react';
import type { Blueprint, UserBlueprintData } from '../types';
import { MilestoneProgress } from './MilestoneProgress';
import { getMilestoneStatus } from '../utils/milestones';
import { getBlueprintImages } from '../utils/blueprintImages';

interface BlueprintCardProps {
  blueprint: Blueprint;
  data: UserBlueprintData;
  onUpdate: (name: string, patch: Partial<UserBlueprintData>) => void;
}

function AscensionStars({ level, onChange }: { level: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5" title={`Ascension: ${level}/3`}>
      {[1, 2, 3].map(star => (
        <button
          key={star}
          onClick={() => onChange(level === star ? star - 1 : star)}
          className={`text-sm leading-none transition-colors ${
            star <= level ? 'text-amber-400 hover:text-amber-300' : 'text-gray-600 hover:text-gray-400'
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

export const BlueprintCard = memo(function BlueprintCard({ blueprint, data, onUpdate }: BlueprintCardProps) {
  const { name, type, tier, source, craftingMilestones, starforgedMilestones } = blueprint;
  const { owned, starforged, ascensionLevel, craftCount } = data;

  const { circleBackground, itemImage, itemImageFallback } = getBlueprintImages(name, type, source);
  const [imgSrc, setImgSrc] = useState<string | null>(itemImage);

  const craftingStatus = getMilestoneStatus(craftCount, craftingMilestones);
  const lastCraftingThreshold = craftingMilestones.length > 0
    ? craftingMilestones[craftingMilestones.length - 1].craftsNeeded
    : 0;
  const sfCraftCount = Math.max(0, craftCount - lastCraftingThreshold);

  const hasMilestones = craftingMilestones.length > 0 || (starforged && starforgedMilestones.length > 0);

  return (
    // No overflow-hidden so the circle can pop above the card top
    <div className={`relative isolate flex flex-col bg-gray-800 rounded-xl border border-gray-700/50 transition-opacity mt-6 ${!owned ? 'opacity-50' : ''}`}>

      {/* Image area — rounded top corners clipped here, not on the outer card */}
      <div className="relative bg-gray-900 rounded-t-xl pt-20 pb-4">

        {/* Circle — centered, pops ~25% of its height above the card */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-24 h-24 z-10 flex items-center justify-center">
          <img
            src={circleBackground}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={name}
              className="relative z-10 w-16 h-16 object-contain drop-shadow-lg"
              onError={() => {
                if (itemImageFallback && imgSrc !== itemImageFallback) {
                  setImgSrc(itemImageFallback);
                } else {
                  setImgSrc(null);
                }
              }}
              draggable={false}
            />
          ) : (
            <span className="relative z-10 text-2xl text-gray-500 select-none">
              {type[0] ?? '?'}
            </span>
          )}

          {/* Ascension stars overlaid at the bottom of the circle */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20">
            <AscensionStars level={ascensionLevel} onChange={v => onUpdate(name, { ascensionLevel: v })} />
          </div>
        </div>

        {/* Tier badge — top left */}
        <div className="absolute top-2 left-2 z-10">
          <TierBadge tier={tier} />
        </div>

        {/* Owned + SF — top right, stacked */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          <label className="flex items-center gap-1 cursor-pointer select-none" title="Owned">
            <span className="text-xs text-gray-400">Own</span>
            <input
              type="checkbox"
              checked={owned}
              onChange={e => onUpdate(name, { owned: e.target.checked })}
              className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none" title="Starforged">
            <span className={`text-xs ${starforged ? 'text-purple-400' : 'text-gray-500'}`}>SF</span>
            <input
              type="checkbox"
              checked={starforged}
              onChange={e => onUpdate(name, { starforged: e.target.checked })}
              className="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Name + type */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-white text-sm font-semibold leading-tight truncate" title={name}>{name}</p>
        <p className="text-gray-500 text-xs mt-0.5">{type}</p>
      </div>

      {/* Craft count */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-gray-700/50 mt-auto">
        <span className="text-xs text-gray-500">Crafts</span>
        <input
          type="number"
          min={0}
          value={craftCount === 0 ? '' : craftCount}
          placeholder="0"
          onChange={e => onUpdate(name, { craftCount: Math.max(0, parseInt(e.target.value) || 0) })}
          className="ml-auto w-14 px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-white text-right focus:outline-none focus:border-amber-500"
          title="Total crafts"
        />
      </div>

      {/* Milestones */}
      {hasMilestones && (
        <div className="px-3 pb-2.5 flex flex-col gap-1 border-t border-gray-700/50 pt-2">
          {craftingMilestones.length > 0 && (
            <MilestoneProgress
              label="Craft"
              milestones={craftingMilestones}
              craftCount={craftCount}
              accent="amber"
            />
          )}
          {starforged && starforgedMilestones.length > 0 && (
            <MilestoneProgress
              label="SF"
              tooltip="Starforged progress"
              milestones={starforgedMilestones}
              craftCount={sfCraftCount}
              accent="purple"
              hideToNext={!craftingStatus.allComplete}
            />
          )}
        </div>
      )}
    </div>
  );
});
