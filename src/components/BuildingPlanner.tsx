import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useBuildings, type Building } from '../hooks/useBuildings';
import { BUILDING_CATEGORIES, BUILDING_META } from '../utils/buildings';

// Cost per tick at 1141+ total ticks invested (assumed for everyone), before
// the building's tier multiplier.
const GOLD_PER_TICK = 100_000_000;
const GEMS_PER_TICK = 250;

const STORAGE_KEY = 'st_building_progress';

interface BuildingInput {
  level: string;
  ticks: string;
}

type ProgressMap = Record<string, BuildingInput>;

function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // fall through to defaults
  }
  return {};
}

interface BuildingCost {
  building: Building;
  level: number;
  isMaxed: boolean;
  ticksNeeded: number;
  ticksInvested: number;
  ticksToNext: number;
  nextEffect: string;
  gold: number;
  gems: number;
}

function computeCost(building: Building, input: BuildingInput | undefined): BuildingCost {
  const rawLevel = parseInt(input?.level ?? '');
  const level = Number.isFinite(rawLevel)
    ? Math.min(Math.max(rawLevel, 1), building.maxLevel)
    : 1;
  const next = building.levels.find(l => l.level === level + 1);

  if (!next) {
    return {
      building, level, isMaxed: true,
      ticksNeeded: 0, ticksInvested: 0, ticksToNext: 0,
      nextEffect: '', gold: 0, gems: 0,
    };
  }

  const rawTicks = parseInt((input?.ticks ?? '').replace(/,/g, ''));
  const ticksInvested = Number.isFinite(rawTicks)
    ? Math.min(Math.max(rawTicks, 0), next.ticks)
    : 0;
  const ticksToNext = next.ticks - ticksInvested;

  return {
    building, level, isMaxed: false,
    ticksNeeded: next.ticks, ticksInvested, ticksToNext,
    nextEffect: next.effect,
    gold: ticksToNext * GOLD_PER_TICK * building.tierMultiplier,
    gems: ticksToNext * GEMS_PER_TICK * building.tierMultiplier,
  };
}

/** Convert cumulative total ticks invested into a level + progress toward the next. */
function levelFromTotalTicks(building: Building, total: number): { level: number; ticks: number } {
  let level = 1;
  let remaining = Math.max(0, total);
  for (const l of building.levels) {
    if (l.level === 1) continue;
    if (remaining < l.ticks) break;
    remaining -= l.ticks;
    level = l.level;
  }
  if (level >= building.maxLevel) return { level: building.maxLevel, ticks: 0 };
  return { level, ticks: remaining };
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return n.toLocaleString();
}

/** Green (cheapest) → red (most expensive) by rank position. */
function rankHue(rank: number, count: number): number {
  const t = count > 1 ? rank / (count - 1) : 0;
  return Math.round(120 - 120 * t);
}

export function BuildingPlanner() {
  const { buildings, loading, error, refresh } = useBuildings();
  const [progress, setProgress] = useState<ProgressMap>(loadProgress);
  const [totalEdit, setTotalEdit] = useState<{ name: string; value: string } | null>(null);
  const [flashName, setFlashName] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const flashTimer = useRef<number>();

  const jumpToBuilding = (name: string) => {
    const el = rowRefs.current.get(name);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('input')?.focus({ preventScroll: true });
    setFlashName(name);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashName(null), 1500);
  };

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const updateBuilding = (name: string, patch: Partial<BuildingInput>) => {
    setProgress(prev => {
      const existing: BuildingInput = prev[name] ?? { level: '', ticks: '' };
      return { ...prev, [name]: { ...existing, ...patch } };
    });
  };

  const applyTotalEdit = (building: Building) => {
    if (!totalEdit || totalEdit.name !== building.name) return;
    const total = parseInt(totalEdit.value.replace(/,/g, ''));
    if (Number.isFinite(total) && total >= 0) {
      const { level, ticks } = levelFromTotalTicks(building, total);
      updateBuilding(building.name, { level: String(level), ticks: String(ticks) });
    }
    setTotalEdit(null);
  };

  const costs = useMemo(
    () => buildings.map(b => computeCost(b, progress[b.name])),
    [buildings, progress],
  );

  // Rank of each upgradeable building by gold cost, cheapest first.
  const ranking = useMemo(
    () => costs.filter(c => !c.isMaxed).sort((a, b) => a.gold - b.gold),
    [costs],
  );
  const rankByName = useMemo(() => {
    const map = new Map<string, number>();
    ranking.forEach((c, i) => map.set(c.building.name, i));
    return map;
  }, [ranking]);

  // Group by category, ordered per src/workers.md; unknown buildings trail in
  // sheet order under "Other".
  const grouped = useMemo(() => {
    const byCategory = new Map<string, BuildingCost[]>();
    for (const c of costs) {
      const category = BUILDING_META[c.building.name]?.category ?? 'Other';
      const items = byCategory.get(category);
      if (items) items.push(c);
      else byCategory.set(category, [c]);
    }
    const result: { category: string; items: BuildingCost[] }[] = [];
    for (const category of [...BUILDING_CATEGORIES, 'Other']) {
      const items = byCategory.get(category);
      if (!items) continue;
      if (category !== 'Other') {
        items.sort((a, b) => BUILDING_META[a.building.name].order - BUILDING_META[b.building.name].order);
      }
      result.push({ category, items });
    }
    return result;
  }, [costs]);

  const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white text-right placeholder-gray-600 focus:outline-none focus:border-amber-500/60';

  if (loading && buildings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-2">
        <div className="text-sm">Fetching buildings from Google Sheets…</div>
      </div>
    );
  }

  if (error && buildings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-gray-800 rounded text-sm hover:bg-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-4 lg:items-start">
      {/* Ranking panel — shown first on mobile, right column on desktop */}
      <div className="lg:order-2 lg:w-72 lg:sticky lg:top-[calc(var(--header-h,57px)+1rem)] shrink-0 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-amber-400 mb-3">Cheapest Next Levels</h2>
        {ranking.length === 0 ? (
          <p className="text-xs text-gray-500">All buildings are maxed.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranking.slice(0, 5).map((c, i) => (
              <li key={c.building.name}>
                <button
                  onClick={() => jumpToBuilding(c.building.name)}
                  title={`Jump to ${c.building.name}`}
                  className="w-full flex items-center gap-2 text-sm text-left rounded px-1 py-0.5 -mx-1 hover:bg-gray-700/50 transition-colors"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-900 shrink-0"
                    style={{ backgroundColor: `hsl(${rankHue(i, Math.max(ranking.length, 5))}, 65%, 45%)` }}
                  >
                    {i + 1}
                  </span>
                  {BUILDING_META[c.building.name] && (
                    <img
                      src={BUILDING_META[c.building.name].icon}
                      alt=""
                      className="w-5 h-5 shrink-0 object-contain"
                    />
                  )}
                  <span className="text-gray-200 truncate flex-1">
                    {c.building.name}
                    <span className="text-gray-500 text-xs"> → Lv. {c.level + 1}</span>
                  </span>
                  <span className="text-amber-300 font-medium whitespace-nowrap">{fmtCompact(c.gold)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
          Assumes max tick cost (1141+ ticks invested): 100M gold / 250 gems per tick,
          × the building&apos;s tier multiplier.
        </p>
      </div>

      {/* Building list */}
      <div className="lg:order-1 flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_6.5rem_7rem_6rem_6.5rem] gap-2 px-3 pb-1 text-[10px] uppercase tracking-wide text-gray-500">
          <span>Building</span>
          <span className="text-right">Level</span>
          <span className="text-right">Ticks Invested</span>
          <span className="text-right">Ticks to Next</span>
          <span className="text-right">Cost to Next</span>
        </div>
        {grouped.map(group => (
          <Fragment key={group.category}>
            <div className="text-[11px] font-semibold text-amber-400/90 uppercase tracking-widest px-1 pt-3 pb-0.5 first:pt-0">
              {group.category}
            </div>
            {group.items.map(c => {
              const input = progress[c.building.name];
              const rank = rankByName.get(c.building.name);
              const hue = rank !== undefined ? rankHue(rank, ranking.length) : undefined;
              return (
            <div
              key={c.building.name}
              ref={el => {
                if (el) rowRefs.current.set(c.building.name, el);
                else rowRefs.current.delete(c.building.name);
              }}
              className={`border border-gray-700/60 rounded-md px-3 py-2 border-l-4 transition-shadow ${c.isMaxed ? 'opacity-50' : ''} ${
                flashName === c.building.name ? 'ring-2 ring-amber-400/80' : ''
              }`}
              style={{
                borderLeftColor: hue !== undefined ? `hsl(${hue}, 65%, 45%)` : '#374151',
                backgroundColor: hue !== undefined ? `hsla(${hue}, 65%, 45%, 0.06)` : undefined,
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_7rem_6rem_6.5rem] gap-x-2 gap-y-1 items-center">
                <div className="col-span-2 sm:col-span-1 min-w-0 flex items-center gap-2">
                  {BUILDING_META[c.building.name] && (
                    <img
                      src={BUILDING_META[c.building.name].icon}
                      alt=""
                      loading="lazy"
                      className="w-8 h-8 shrink-0 object-contain"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-gray-200 font-medium truncate">
                      {c.building.name}
                      {c.building.tierMultiplier > 1 && (
                        <span className="ml-1.5 text-[10px] text-purple-400 border border-purple-800/60 rounded px-1 py-px align-middle">
                          ×{c.building.tierMultiplier}
                        </span>
                      )}
                    </div>
                    {!c.isMaxed && c.nextEffect && (
                      <div className="text-xs text-gray-500 truncate" title={c.nextEffect}>
                        Lv. {c.level + 1}: {c.nextEffect}
                      </div>
                    )}
                  </div>
                </div>
                {totalEdit?.name === c.building.name ? (
                  <>
                    <div className="col-span-2 sm:col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        autoFocus
                        value={totalEdit.value}
                        placeholder="total ticks invested"
                        onChange={e => setTotalEdit({ name: c.building.name, value: e.target.value })}
                        onBlur={() => applyTotalEdit(c.building)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') applyTotalEdit(c.building);
                          if (e.key === 'Escape') setTotalEdit(null);
                        }}
                        className={inputCls}
                        aria-label={`${c.building.name} total ticks invested`}
                      />
                    </div>
                    {c.isMaxed ? (
                      <div className="hidden sm:block sm:col-span-2" />
                    ) : (
                      <>
                        <div className="text-right text-sm text-gray-300">
                          {c.ticksToNext.toLocaleString()}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-amber-300" title={`${c.gold.toLocaleString()} gold`}>
                            {fmtCompact(c.gold)}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            or {fmtCompact(c.gems)} gems
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : c.isMaxed ? (
                  <>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTotalEdit({ name: c.building.name, value: '' })}
                        title="Enter total ticks invested to auto-set level and progress"
                        aria-label={`${c.building.name} set from total ticks`}
                        className="shrink-0 w-6 self-stretch rounded border border-gray-700 text-gray-500 hover:text-amber-400 hover:border-amber-500/60 text-xs transition-colors"
                      >
                        Σ
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={c.building.maxLevel}
                        value={input?.level ?? ''}
                        placeholder="1"
                        onChange={e => updateBuilding(c.building.name, { level: e.target.value })}
                        className={inputCls}
                        aria-label={`${c.building.name} level`}
                      />
                    </div>
                    <div className="sm:col-span-3 text-right text-xs font-semibold text-gray-500">
                      MAX (Lv. {c.building.maxLevel})
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTotalEdit({ name: c.building.name, value: '' })}
                        title="Enter total ticks invested to auto-set level and progress"
                        aria-label={`${c.building.name} set from total ticks`}
                        className="shrink-0 w-6 self-stretch rounded border border-gray-700 text-gray-500 hover:text-amber-400 hover:border-amber-500/60 text-xs transition-colors"
                      >
                        Σ
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={c.building.maxLevel}
                        value={input?.level ?? ''}
                        placeholder="1"
                        onChange={e => updateBuilding(c.building.name, { level: e.target.value })}
                        className={inputCls}
                        aria-label={`${c.building.name} level`}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max={c.ticksNeeded}
                        value={input?.ticks ?? ''}
                        placeholder="0"
                        onChange={e => updateBuilding(c.building.name, { ticks: e.target.value })}
                        className={inputCls}
                        aria-label={`${c.building.name} ticks invested`}
                      />
                      <span className="text-[10px] text-gray-600 whitespace-nowrap">
                        / {c.ticksNeeded.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right text-sm text-gray-300">
                      {c.ticksToNext.toLocaleString()}
                    </div>
                    <div className="text-right">
                      <div
                        className="text-sm font-semibold text-amber-300"
                        title={`${c.gold.toLocaleString()} gold`}
                      >
                        {fmtCompact(c.gold)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        or {fmtCompact(c.gems)} gems
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
