import { useMemo, useState } from 'react';
import { MAIN_CATEGORIES, SUBCATEGORIES, type MainCategory } from '../utils/categories';
import { getBlueprintImages } from '../utils/blueprintImages';
import { getGoalStatus, type GoalStatus } from '../utils/ascensionGoals';
import type { AscensionGoals, Blueprint, UserBlueprintData } from '../types';

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
  goals: AscensionGoals;
  onSetGoal: (type: string, stars: number) => void;
}

interface GoalEntry extends SummaryRowDef {
  status: GoalStatus;
}

const TOP_COUNT_KEY = 'st_goal_top_count';
const OWNED_ONLY_KEY = 'st_goal_owned_only';

function CheapestGoalsPanel({
  entries, topCount, onTopCountChange, ownedOnly, onOwnedOnlyChange,
}: {
  entries: GoalEntry[];
  topCount: number;
  onTopCountChange: (n: number) => void;
  ownedOnly: boolean;
  onOwnedOnlyChange: (v: boolean) => void;
}) {
  const met = entries.filter(e => e.status.needed === 0);
  // Unmet goals, cheapest first; unreachable ones (cost null) sort to the end.
  const ranked = entries
    .filter(e => e.status.needed > 0)
    .sort((a, b) =>
      ((a.status.cost === null ? 1 : 0) - (b.status.cost === null ? 1 : 0)) ||
      ((a.status.cost ?? 0) - (b.status.cost ?? 0)) ||
      (a.status.needed - b.status.needed) ||
      a.label.localeCompare(b.label),
    )
    .slice(0, topCount);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-bold text-white">Cheapest Goals</span>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center rounded overflow-hidden border border-gray-600 text-xs"
            title="Which blueprints may count toward a goal"
          >
            {([[true, 'Owned'], [false, 'All']] as [boolean, string][]).map(([value, label]) => (
              <button
                key={label}
                onClick={() => onOwnedOnlyChange(value)}
                className={`px-2 py-0.5 transition-colors ${
                  ownedOnly === value
                    ? 'bg-amber-500 text-gray-900 font-medium'
                    : 'bg-gray-900 text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            show top
            <select
              value={Number.isFinite(topCount) ? String(topCount) : 'all'}
              onChange={e => onTopCountChange(e.target.value === 'all' ? Number.POSITIVE_INFINITY : parseInt(e.target.value))}
              className="bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-200"
            >
              {[1, 3, 5, 10].map(n => <option key={n} value={n}>{n}</option>)}
              <option value="all">all</option>
            </select>
          </label>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-500 py-1">
          Set a goal star count on any subtype row below, and the cheapest goals to
          finish with your owned blueprints will be ranked here.
        </p>
      ) : (
        <>
          {ranked.length > 0 && (
            <div className="flex flex-col">
              {ranked.map((e, i) => (
                <div key={e.type} className="flex items-center gap-2.5 py-1.5">
                  <span className="text-xs text-gray-500 tabular-nums w-5 shrink-0">#{i + 1}</span>
                  <img src={e.icon} alt="" className="h-6 w-6 object-contain shrink-0" />
                  <span className="text-xs text-gray-300 truncate min-w-0 flex-1">{e.label}</span>
                  <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap shrink-0">
                    ★ {e.status.earned} / {e.status.goal}
                  </span>
                  {e.status.cost === null ? (
                    <span
                      className="text-xs text-red-500 font-semibold whitespace-nowrap shrink-0 w-28 text-right"
                      title={`Not enough ascension stars available on ${ownedOnly ? 'owned' : 'all'} blueprints`}
                    >
                      Unreachable
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold tabular-nums whitespace-nowrap shrink-0 w-28 text-right">
                      {e.status.cost.toLocaleString()} shards
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {ranked.length === 0 && (
            <p className="text-xs text-green-500 py-1">All goals met ✓</p>
          )}
          {met.length > 0 && ranked.length > 0 && (
            <p className="text-[10px] text-green-600">✓ {met.length} goal{met.length === 1 ? '' : 's'} already met</p>
          )}
          <p className="text-[10px] text-gray-500">
            Cost = fewest ascension shards still needed
            {ownedOnly ? ' using owned blueprints' : ' if any blueprint may be ascended'}
          </p>
        </>
      )}
    </div>
  );
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
    <div className="flex items-baseline gap-1.5 tabular-nums whitespace-nowrap shrink-0">
      <span className="text-amber-400 font-semibold text-sm">★ {stats.earned}</span>
      <span className="text-gray-400 text-sm">/ {stats.ownedMax}<span className="hidden sm:inline"> owned</span></span>
      <span className="text-gray-600 text-xs">/ {stats.totalMax}<span className="hidden sm:inline"> total</span></span>
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
          className={`text-2xl sm:text-3xl leading-none px-0.5 transition-colors ${
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
      <span className="text-xs text-gray-300 truncate flex-1 min-w-0" title={blueprint.name}>{blueprint.name}</span>
      <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0" title="Owned">
        <span className="hidden sm:inline text-xs text-gray-400">Owned</span>
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

export function AscensionSummary({ blueprints, getUserData, onUpdate, goals, onSetGoal }: AscensionSummaryProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [topCount, setTopCount] = useState(() => {
    const raw = localStorage.getItem(TOP_COUNT_KEY) ?? '';
    if (raw === 'all') return Number.POSITIVE_INFINITY;
    const v = parseInt(raw);
    return v > 0 ? v : 3;
  });
  const [ownedOnly, setOwnedOnly] = useState(() => localStorage.getItem(OWNED_ONLY_KEY) !== '0');

  function changeTopCount(n: number) {
    setTopCount(n);
    localStorage.setItem(TOP_COUNT_KEY, Number.isFinite(n) ? String(n) : 'all');
  }

  function changeOwnedOnly(v: boolean) {
    setOwnedOnly(v);
    localStorage.setItem(OWNED_ONLY_KEY, v ? '1' : '0');
  }

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

  const goalEntries = useMemo(() => {
    return ROW_DEFS
      .map(row => {
        const goal = goals[row.type] ?? 0;
        const bps = blueprintsByType.get(row.type);
        if (goal <= 0 || !bps) return null;
        return { ...row, status: getGoalStatus(goal, bps, getUserData, ownedOnly) };
      })
      .filter((e): e is GoalEntry => e !== null);
  }, [goals, blueprintsByType, getUserData, ownedOnly]);

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

      {/* Cheapest goals to finish */}
      <CheapestGoalsPanel
        entries={goalEntries}
        topCount={topCount}
        onTopCountChange={changeTopCount}
        ownedOnly={ownedOnly}
        onOwnedOnlyChange={changeOwnedOnly}
      />

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
              const goal = goals[row.type] ?? 0;
              const goalMet = goal > 0 && row.stats.earned >= goal;
              return (
                <div key={row.type} className="bg-gray-800 border border-gray-700 rounded-lg">
                  {/* Sticks below the app header (57px) until the section scrolls past */}
                  <div
                    className={`sticky top-[var(--header-h)] z-10 flex items-center bg-gray-800 rounded-t-lg ${
                      isExpanded ? 'shadow-md shadow-gray-950/50' : 'rounded-b-lg'
                    }`}
                  >
                    <button
                      onClick={() => toggleExpanded(row.type)}
                      title={`${isExpanded ? 'Collapse' : 'Expand'} ${row.label}`}
                      className={`flex items-center gap-3 pl-3 pr-2 py-2 flex-1 min-w-0 hover:bg-gray-700 transition-colors text-left rounded-tl-lg ${
                        isExpanded ? '' : 'rounded-bl-lg'
                      }`}
                    >
                      <span className={`text-gray-500 text-[10px] shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                      <img src={row.icon} alt="" className="h-7 w-7 object-contain shrink-0" />
                      <span className="text-xs font-medium text-gray-300 truncate min-w-0 flex-1 sm:flex-none sm:w-28">{row.label}</span>
                      <div className="hidden sm:block flex-1 min-w-0">
                        <ProgressBar value={row.stats.earned} max={row.stats.ownedMax} />
                      </div>
                      <StatLine stats={row.stats} />
                    </button>
                    <label
                      className="flex items-center gap-1 pl-1 pr-3 py-2 shrink-0"
                      title={`Goal ascension stars for ${row.label} (0–${row.stats.totalMax})`}
                    >
                      <span className="hidden sm:inline text-[10px] text-gray-500">Goal</span>
                      <input
                        type="number"
                        min={0}
                        max={row.stats.totalMax}
                        value={goal > 0 ? goal : ''}
                        placeholder="–"
                        onChange={e => {
                          const raw = parseInt(e.target.value);
                          const v = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(raw, row.stats.totalMax));
                          onSetGoal(row.type, v);
                        }}
                        className={`w-12 bg-gray-900 border rounded px-1 py-0.5 text-xs text-right tabular-nums text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 ${
                          goalMet ? 'border-green-600' : 'border-gray-600'
                        }`}
                      />
                    </label>
                  </div>
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
