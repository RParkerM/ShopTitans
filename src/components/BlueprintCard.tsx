import { memo, useState } from 'react';
import type { Blueprint, UserBlueprintData } from '../types';
import { getMilestoneStatus } from '../utils/milestones';
import { getBlueprintImages } from '../utils/blueprintImages';

interface BlueprintCardProps {
  blueprint: Blueprint;
  data: UserBlueprintData;
  onUpdate: (name: string, patch: Partial<UserBlueprintData>) => void;
  onClick: () => void;
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

function CraftProgressBar({ craftCount, milestones }: { craftCount: number; milestones: Blueprint['craftingMilestones'] }) {
  if (milestones.length === 0) return null;
  const status = getMilestoneStatus(craftCount, milestones);
  if (status.allComplete) {
    return (
      <div className="px-3 py-2 border-t border-gray-700/50 text-center text-[11px] text-amber-500/70">
        All milestones done
      </div>
    );
  }
  const next = milestones[status.completed];
  const pct = Math.min(100, (craftCount / next.craftsNeeded) * 100);
  return (
    <div className="px-3 pt-2 pb-2.5 border-t border-gray-700/50 flex flex-col gap-1">
      <div className="flex justify-between text-[11px] text-gray-400">
        <span>{craftCount} / {next.craftsNeeded}</span>
        <span className="text-gray-600 truncate max-w-[55%] text-right">{next.reward}</span>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const BlueprintCard = memo(function BlueprintCard({ blueprint, data, onUpdate, onClick }: BlueprintCardProps) {
  const { name, type, tier, source, craftingMilestones } = blueprint;
  const { owned, starforged, ascensionLevel, craftCount } = data;

  const { circleBackground, itemImage, itemImageFallback } = getBlueprintImages(name, type, source);
  const [imgSrc, setImgSrc] = useState<string | null>(itemImage);

  return (
    <div
      onClick={onClick}
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
              onChange={e => onUpdate(name, { owned: e.target.checked })}
              className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
            />
          </label>
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
        </div>
      </div>

      {/* Name + type */}
      <div className="px-3 pt-3 pb-2 flex-1">
        <p className="text-white text-sm font-semibold leading-tight truncate" title={name}>{name}</p>
        <p className="text-gray-500 text-xs mt-0.5">{type}</p>
      </div>

      {/* Craft progress bar */}
      <CraftProgressBar craftCount={craftCount} milestones={craftingMilestones} />
    </div>
  );
});
