import { useMemo, useState } from 'react';
import { MAIN_CATEGORIES, SUBCATEGORIES, type MainCategory } from '../utils/categories';
import { getBlueprintImages } from '../utils/blueprintImages';
import type { Blueprint, UserBlueprintData } from '../types';

interface SummaryRowDef {
  label: string;
  icon: string;
  type: string; // matches bp.type
  category: Exclude<MainCategory, 'All'>;
}

// Enchantment blueprints have type 'Element' or 'Spirit', but the Enchantments
// subcategory filter values are element names — so those two rows are defined by hand.
const ROW_DEFS: SummaryRowDef[] = (['Weapons', 'Armor', 'Accessories', 'Stones'] as const)
  .flatMap(cat =>
    SUBCATEGORIES[cat].map((sub): SummaryRowDef => ({
      label: sub.label,
      icon: sub.icon,
      type: sub.value,
      category: cat as Exclude<MainCategory, 'All'>,
    })),
  )
  .concat([
    {
      label: 'Elements',
      icon: '/fan-kit/Item%20Types/icon_global_item_fire_big.png',
      type: 'Element',
      category: 'Enchantments',
    },
    {
      label: 'Spirits',
      icon: '/fan-kit/Item%20Types/icon_global_item_spirit_big.png',
      type: 'Spirit',
      category: 'Enchantments',
    },
  ]);

interface TypeStats {
  earned: number;    // stars unlocked on owned blueprints
  ownedMax: number;  // stars available across owned ascendable blueprints
  totalMax: number;  // stars available across all ascendable blueprints
}

interface AscensionSummaryProps {
  blueprints: Blueprint[];
  getUserData: (name: string) => UserBlueprintData;
  onUpdate: (name: string, patch: Partial<UserBlueprintData>) => void;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatLine({ stats }: { stats: TypeStats }) {
  return (
    <div className="flex items-baseline gap-1.5 tabular-nums whitespace-nowrap">
      <span className="text-amber-400 font-semibold text-sm">★ {stats.earned}</span>
      <span className="text-gray-400 text-sm">/ {stats.ownedMax} owned</span>
      <span className="text-gray-600 text-xs">/ {stats.totalMax} total</span>
    </div>
  );
}

function MiniBlueprintIcon({ blueprint }: { blueprint: Blueprint }) {
  const { circleBackground, itemImage, itemImageFallback } = getBlueprintImages(
    blueprint.name, blueprint.type, blueprint.source,
  );
  const [imgSrc, setImgSrc] = useState<string | null>(itemImage);
  return (
    <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
      <img src={circleBackground} alt="" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={blueprint.name}
          className="relative z-10 w-6 h-6 object-contain"
          onError={() => {
            if (itemImageFallback && imgSrc !== itemImageFallback) setImgSrc(itemImageFallback);
            else setImgSrc(null);
          }}
          draggable={false}
        />
      ) : (
        <span className="relative z-10 text-[10px] text-gray-500 select-none">{blueprint.type[0] ?? '?'}</span>
      )}
    </div>
  );
}

function AscensionStars({
  level, max, dimmed, onChange,
}: {
  level: number; max: number; dimmed: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className={`flex gap-0.5 shrink-0 ${dimmed ? 'opacity-40' : ''}`} title={`Ascension: ${level}/${max}`}>
      {[1, 2, 3].map(star => (
        <button
          key={star}
          disabled={star > max}
          onClick={() => onChange(level === star ? star - 1 : star)}
          className={`text-3xl leading-none px-0.5 transition-colors ${
            star > max ? 'text-transparent cursor-default'
            : star <= level ? 'text-amber-400 hover:text-amber-300'
            : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function BlueprintRow({
  blueprint, data, onUpdate,
}: {
  blueprint: Blueprint;
  data: UserBlueprintData;
  onUpdate: (name: string, patch: Partial<UserBlueprintData>) => void;
}) {
  const maxStars = Math.min(blueprint.ascensionUpgrades.length, 3);
  return (
    <div className={`isolate flex items-center gap-2.5 px-3 py-1.5 rounded transition-opacity ${data.owned ? '' : 'opacity-60'}`}>
      <span className="text-xs text-gray-500 tabular-nums w-7 shrink-0">T{blueprint.tier}</span>
      <MiniBlueprintIcon blueprint={blueprint} />
      <span className="text-xs text-gray-300 truncate w-44 shrink-0" title={blueprint.name}>{blueprint.name}</span>
      <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0" title="Owned">
        <span className="text-xs text-gray-400">Owned</span>
        <input
          type="checkbox"
          checked={data.owned}
          onChange={e => onUpdate(blueprint.name, e.target.checked ? { owned: true } : { owned: false, starforged: false })}
          className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
        />
      </label>
      <AscensionStars
        level={Math.min(data.ascensionLevel, maxStars)}
        max={maxStars}
        dimmed={!data.owned}
        onChange={v => onUpdate(blueprint.name, { ascensionLevel: v })}
      />
    </div>
  );
}

export function AscensionSummary({ blueprints, getUserData, onUpdate }: AscensionSummaryProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(type: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  // Ascendable blueprints grouped by type, newest first (the app's default sort).
  const blueprintsByType = useMemo(() => {
    const map = new Map<string, Blueprint[]>();
    for (const bp of blueprints) {
      if (bp.ascensionUpgrades.length === 0) continue;
      let list = map.get(bp.type);
      if (!list) {
        list = [];
        map.set(bp.type, list);
      }
      list.push(bp);
    }
    for (const list of map.values()) list.reverse();
    return map;
  }, [blueprints]);

  const statsByType = useMemo(() => {
    const map = new Map<string, TypeStats>();
    for (const [type, bps] of blueprintsByType) {
      const stats: TypeStats = { earned: 0, ownedMax: 0, totalMax: 0 };
      for (const bp of bps) {
        const maxStars = Math.min(bp.ascensionUpgrades.length, 3);
        stats.totalMax += maxStars;
        const data = getUserData(bp.name);
        if (data.owned) {
          stats.ownedMax += maxStars;
          stats.earned += Math.min(data.ascensionLevel, maxStars);
        }
      }
      map.set(type, stats);
    }
    return map;
  }, [blueprintsByType, getUserData]);

  const sections = useMemo(() => {
    return MAIN_CATEGORIES
      .filter(cat => cat.id !== 'All')
      .map(cat => {
        const rows = ROW_DEFS
          .filter(row => row.category === cat.id)
          .map(row => ({ ...row, stats: statsByType.get(row.type) }))
          .filter((row): row is typeof row & { stats: TypeStats } => row.stats !== undefined);
        const subtotal = rows.reduce(
          (acc, row) => ({
            earned: acc.earned + row.stats.earned,
            ownedMax: acc.ownedMax + row.stats.ownedMax,
            totalMax: acc.totalMax + row.stats.totalMax,
          }),
          { earned: 0, ownedMax: 0, totalMax: 0 },
        );
        return { category: cat, rows, subtotal };
      })
      .filter(section => section.rows.length > 0);
  }, [statsByType]);

  const grandTotal = useMemo(
    () =>
      sections.reduce(
        (acc, s) => ({
          earned: acc.earned + s.subtotal.earned,
          ownedMax: acc.ownedMax + s.subtotal.ownedMax,
          totalMax: acc.totalMax + s.subtotal.totalMax,
        }),
        { earned: 0, ownedMax: 0, totalMax: 0 },
      ),
    [sections],
  );

  if (sections.length === 0) {
    return (
      <p className="text-gray-600 text-sm text-center py-16">
        No ascension data found in the blueprint sheet.
      </p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Grand total */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">All Ascensions</span>
          <StatLine stats={grandTotal} />
        </div>
        <ProgressBar value={grandTotal.earned} max={grandTotal.ownedMax} />
        <p className="text-[10px] text-gray-500">
          ★ earned / stars available on owned blueprints / total possible (3 per ascendable blueprint)
        </p>
      </div>

      {/* Per-category sections */}
      {sections.map(({ category, rows, subtotal }) => (
        <section key={category.id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <img src={category.icon} alt="" className="h-6 w-auto" />
              <h2 className="text-sm font-bold text-gray-200">{category.label}</h2>
            </div>
            <StatLine stats={subtotal} />
          </div>
          <div className="flex flex-col gap-1">
            {rows.map(row => {
              const isExpanded = expanded.has(row.type);
              return (
                <div key={row.type} className="bg-gray-800 border border-gray-700 rounded-lg">
                  {/* Sticks below the app header (57px) until the section scrolls past */}
                  <button
                    onClick={() => toggleExpanded(row.type)}
                    title={`${isExpanded ? 'Collapse' : 'Expand'} ${row.label}`}
                    className={`sticky top-[57px] z-10 flex items-center gap-3 px-3 py-2 w-full bg-gray-800 hover:bg-gray-700 transition-colors text-left rounded-t-lg ${
                      isExpanded ? 'shadow-md shadow-gray-950/50' : 'rounded-b-lg'
                    }`}
                  >
                    <span className={`text-gray-500 text-[10px] shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <img src={row.icon} alt="" className="h-7 w-7 object-contain shrink-0" />
                    <span className="text-xs font-medium text-gray-300 w-28 shrink-0">{row.label}</span>
                    <div className="flex-1 min-w-0">
                      <ProgressBar value={row.stats.earned} max={row.stats.ownedMax} />
                    </div>
                    <StatLine stats={row.stats} />
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-700 py-1.5 flex flex-col">
                      {(blueprintsByType.get(row.type) ?? []).map(bp => (
                        <BlueprintRow
                          key={bp.name}
                          blueprint={bp}
                          data={getUserData(bp.name)}
                          onUpdate={onUpdate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
