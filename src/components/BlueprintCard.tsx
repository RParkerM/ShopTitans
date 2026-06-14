import { memo, useState } from 'react';
import type { Blueprint, UserBlueprintData } from '../types';
import { getMilestoneStatus } from '../utils/milestones';
import { getBlueprintImages } from '../utils/blueprintImages';
import { TierBadge } from './TierBadge';

interface BlueprintCardProps {
  blueprint: Blueprint;
  data: UserBlueprintData;
  onUpdate: (name: string, patch: Partial<UserBlueprintData>) => void;
  onClick: (tab?: 'milestones') => void;
}

function AscensionStars({ level, onChange }: { level: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5" title={`Ascension: ${level}/3`}>
      {[1, 2, 3].map(star => (
        <button
          key={star}
          onClick={e => { e.stopPropagation(); onChange(level === star ? star - 1 : star); }}
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

function ProgressBar({
  craftCount,
  milestones,
  color,
  label,
  baseCount = 0,
  onClick,
}: {
  craftCount: number;
  milestones: Blueprint['craftingMilestones'];
  color: 'amber' | 'purple';
  label?: string;
  baseCount?: number;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const status = getMilestoneStatus(craftCount, milestones);
  if (status.allComplete) return null;
  const next = milestones[status.completed];
  const prev = milestones[status.completed - 1];
  const prevNeeded = prev?.craftsNeeded ?? baseCount;
  const relCrafts = craftCount - prevNeeded;
  const relTotal = next.craftsNeeded - prevNeeded;
  const pct = Math.min(100, (relCrafts / relTotal) * 100);
  const barColor = color === 'purple' ? 'bg-purple-500' : 'bg-amber-500';
  const textColor = color === 'purple' ? 'text-purple-400' : 'text-gray-400';
  return (
    <div
      onClick={onClick}
      className={`px-3 pt-2 pb-2.5 border-t border-gray-700/50 flex flex-col gap-1 rounded-b-xl ${onClick ? 'cursor-pointer hover:bg-gray-700/30 transition-colors' : ''}`}
    >
      <div className="flex justify-between text-[11px] text-gray-400">
        <span className={textColor}>
          {relCrafts} / {relTotal}{label && <span className="text-gray-600 ml-1">{label}</span>}
        </span>
        <span className="text-gray-600 truncate max-w-[55%] text-right">{next.reward}</span>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CraftProgressBar({
  craftCount,
  milestones,
  starforged,
  starforgedMilestones,
  onMilestonesClick,
}: {
  craftCount: number;
  milestones: Blueprint['craftingMilestones'];
  starforged: boolean;
  starforgedMilestones: Blueprint['starforgedMilestones'];
  onMilestonesClick: () => void;
}) {
  if (milestones.length === 0) return null;
  const craftStatus = getMilestoneStatus(craftCount, milestones);
  const handleClick = (e: React.MouseEvent) => { e.stopPropagation(); onMilestonesClick(); };

  if (!craftStatus.allComplete) {
    return <ProgressBar craftCount={craftCount} milestones={milestones} color="amber" onClick={handleClick} />;
  }

  // Crafting milestones done — check SF milestones if applicable
  if (starforged && starforgedMilestones.length > 0) {
    const lastCraftThreshold = milestones[milestones.length - 1].craftsNeeded;
    const offsetSfMilestones = starforgedMilestones.map(m => ({ ...m, craftsNeeded: m.craftsNeeded + lastCraftThreshold }));
    const sfStatus = getMilestoneStatus(craftCount, offsetSfMilestones);
    if (!sfStatus.allComplete) {
      return <ProgressBar craftCount={craftCount} milestones={offsetSfMilestones} color="purple" label="SF" baseCount={lastCraftThreshold} onClick={handleClick} />;
    }
  }

  return (
    <div
      onClick={handleClick}
      className="px-3 py-2 border-t border-gray-700/50 text-center text-[11px] text-amber-500/70 rounded-b-xl cursor-pointer hover:bg-gray-700/30 transition-colors"
    >
      All milestones done
    </div>
  );
}

export const BlueprintCard = memo(function BlueprintCard({ blueprint, data, onUpdate, onClick }: BlueprintCardProps) {
  const { name, type, tier, source, craftingMilestones, starforgedMilestones } = blueprint;
  const { owned, starforged, ascensionLevel, craftCount } = data;

  const { circleBackground, itemImage, itemImageFallback } = getBlueprintImages(name, type, source);
  const [imgSrc, setImgSrc] = useState<string | null>(itemImage);

  return (
    <div
      onClick={() => onClick()}
      className={`relative isolate flex flex-col bg-gray-800 rounded-xl border border-gray-700/50 transition-opacity mt-6 cursor-pointer hover:border-gray-500 ${!owned ? 'opacity-50' : ''}`}
    >
      {/* Image area */}
      <div className="relative bg-gray-900 rounded-t-xl pt-20 pb-4">

        {/* Circle */}
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

          {/* Ascension stars — stopPropagation handled inside AscensionStars */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20">
            <AscensionStars level={ascensionLevel} onChange={v => onUpdate(name, { ascensionLevel: v })} />
          </div>
        </div>

        {/* Tier badge */}
        <div className="absolute top-2 left-2 z-10">
          <TierBadge tier={tier} />
        </div>

        {/* Own + SF */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          <label
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 cursor-pointer select-none"
            title="Owned"
          >
            <span className="text-xs text-gray-400">Own</span>
            <input
              type="checkbox"
              checked={owned}
              onChange={e => onUpdate(name, e.target.checked ? { owned: true } : { owned: false, starforged: false })}
              className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
            />
          </label>
          {owned && (
            <label
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 cursor-pointer select-none"
              title="Starforged"
            >
              <span className={`text-xs ${starforged ? 'text-purple-400' : 'text-gray-500'}`}>SF</span>
              <input
                type="checkbox"
                checked={starforged}
                onChange={e => onUpdate(name, { starforged: e.target.checked })}
                className="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
              />
            </label>
          )}
        </div>
      </div>

      {/* Name + type */}
      <div className="px-3 pt-3 pb-2 flex-1">
        <p className="text-white text-sm font-semibold leading-tight truncate" title={name}>{name}</p>
        <p className="text-gray-500 text-xs mt-0.5">{type}</p>
      </div>

      {/* Craft progress bar */}
      <CraftProgressBar
        craftCount={craftCount}
        milestones={craftingMilestones}
        starforged={starforged}
        starforgedMilestones={starforgedMilestones}
        onMilestonesClick={() => onClick('milestones')}
      />
    </div>
  );
});
