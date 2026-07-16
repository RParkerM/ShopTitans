import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useBuildings, type Building } from '../hooks/useBuildings';
import { BUILDING_CATEGORIES, BUILDING_META, BUILDING_ORDER } from '../utils/buildings';
import { encodeTotals, planFromHash, INITIAL_SHARED_TOTALS } from '../utils/sharePlan';

// Cost per tick at 1141+ total ticks invested (assumed for everyone), before
// the building's tier multiplier.
const GOLD_PER_TICK = 100_000_000;
const GEMS_PER_TICK = 250;

const STORAGE_KEY = 'st_building_progress';
const TOP_COUNT_KEY = 'st_building_top_count';

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

/** Cumulative total ticks invested implied by an input, with the same clamping as computeCost. */
function totalTicksInvested(building: Building, input: BuildingInput | undefined): number {
  const c = computeCost(building, input);
  let total = 0;
  for (const l of building.levels) {
    if (l.level > 1 && l.level <= c.level) total += l.ticks;
  }
  return total + c.ticksInvested;
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
  const [viewingShared, setViewingShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharedTotals, setSharedTotals] = useState<number[] | null>(INITIAL_SHARED_TOTALS);
  const [topCount, setTopCount] = useState(() => {
    const raw = localStorage.getItem(TOP_COUNT_KEY) ?? '';
    if (raw === 'all') return Number.POSITIVE_INFINITY;
    const v = parseInt(raw);
    return v > 0 ? v : 5;
  });

  const changeTopCount = (n: number) => {
    setTopCount(n);
    localStorage.setItem(TOP_COUNT_KEY, Number.isFinite(n) ? String(n) : 'all');
  };
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const flashTimer = useRef<number>();
  const copyTimer = useRef<number>();

  const jumpToBuilding = (name: string) => {
    const el = rowRefs.current.get(name);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('input')?.focus({ preventScroll: true });
    setFlashName(name);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashName(null), 1500);
  };

  useEffect(() => () => {
    window.clearTimeout(flashTimer.current);
    window.clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    // While viewing a shared plan the user's own saved progress stays untouched.
    if (viewingShared) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress, viewingShared]);

  // Pasting a share link into an already-open tab is a hash-only navigation —
  // no reload, so the module-load capture misses it. Watch for it here.
  useEffect(() => {
    const onHashChange = () => {
      const totals = planFromHash(window.location.hash);
      if (totals) setSharedTotals(totals);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Apply a shared plan from the URL once building data is available.
  useEffect(() => {
    if (!sharedTotals || buildings.length === 0) return;
    const byName = new Map(buildings.map(b => [b.name, b]));
    const shared: ProgressMap = {};
    sharedTotals.forEach((total, i) => {
      const building = byName.get(BUILDING_ORDER[i]);
      if (!building || total <= 0) return;
      const { level, ticks } = levelFromTotalTicks(building, total);
      shared[building.name] = { level: String(level), ticks: String(ticks) };
    });
    setProgress(shared);
    setViewingShared(true);
    setSharedTotals(null);
    // Drop the hash so pasting the same link again still fires hashchange.
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [buildings, sharedTotals]);

  const sharePlan = async () => {
    const byName = new Map(buildings.map(b => [b.name, b]));
    const totals = BUILDING_ORDER.map(name => {
      const building = byName.get(name);
      return building ? totalTicksInvested(building, progress[name]) : 0;
    });
    const url = `${location.origin}${location.pathname}?view=buildings#plan=${encodeTotals(totals)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const updateBuilding = (name: string, patch: Partial<BuildingInput>) => {
    setProgress(prev => {
      const existing: BuildingInput = prev[name] ?? { level: '', ticks: '' };
      return { ...prev, [name]: { ...existing, ...patch } };
    });
  };

  const stepLevel = (c: BuildingCost, delta: 1 | -1) => {
    const next = Math.min(Math.max(c.level + delta, 1), c.building.maxLevel);
    if (next === c.level) return;
    updateBuilding(c.building.name, { level: String(next), ticks: '0' });
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
  const arrowBtnCls =
    'px-1 text-[7px] leading-[14px] border border-gray-700 bg-gray-800 text-gray-400 hover:text-amber-400 hover:border-amber-500/60 disabled:opacity-30 disabled:pointer-events-none transition-colors';

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
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
      {viewingShared && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-sky-900/30 border border-sky-800/60 rounded-lg px-4 py-2.5 text-sm text-sky-200">
          <span className="flex-1 min-w-48">
            Viewing a shared building plan — your own saved progress is untouched.
          </span>
          <button
            onClick={() => setViewingShared(false)}
            className="px-3 py-1 rounded border border-sky-700 hover:bg-sky-800/50 text-xs whitespace-nowrap transition-colors"
          >
            Save as my progress
          </button>
          <button
            onClick={() => {
              setProgress(loadProgress());
              setViewingShared(false);
            }}
            className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 text-xs whitespace-nowrap transition-colors"
          >
            Back to mine
          </button>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
      {/* Ranking panel — shown first on mobile, right column on desktop */}
      <div className="lg:order-2 lg:w-72 lg:sticky lg:top-[calc(var(--header-h,57px)+1rem)] lg:max-h-[calc(100vh-var(--header-h,57px)-2rem)] lg:overflow-y-auto shrink-0 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-semibold text-amber-400">Cheapest Next Levels</h2>
          <button
            onClick={sharePlan}
            title="Copy a link that shows this plan to anyone who opens it"
            className="px-2 py-0.5 rounded border border-gray-700 text-xs text-gray-400 hover:text-amber-400 hover:border-amber-500/60 transition-colors"
          >
            {copied ? 'Copied!' : '🔗 Share'}
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          show top
          <select
            value={Number.isFinite(topCount) ? String(topCount) : 'all'}
            onChange={e => changeTopCount(e.target.value === 'all' ? Number.POSITIVE_INFINITY : parseInt(e.target.value))}
            className="bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-200"
          >
            {[5, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
            <option value="all">all</option>
          </select>
        </label>
        {ranking.length === 0 ? (
          <p className="text-xs text-gray-500">All buildings are maxed.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranking.slice(0, topCount).map((c, i) => (
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
                  <span className="flex-1 min-w-0 flex items-baseline gap-1">
                    <span className="text-gray-200 truncate">{c.building.name}</span>
                    <span className="text-gray-500 text-xs whitespace-nowrap shrink-0">→ Lv. {c.level + 1}</span>
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
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_8rem_7rem_6rem_6.5rem] gap-2 px-3 pb-1 text-[10px] uppercase tracking-wide text-gray-500">
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
              <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_6rem_6.5rem] gap-x-2 gap-y-1 items-center">
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
                      <span
                        title={`Upgrade costs are ${c.building.tierMultiplier}× the base tick cost`}
                        className={`ml-1.5 text-[10px] rounded px-1 py-px align-middle whitespace-nowrap border ${
                          c.building.tierMultiplier > 1
                            ? 'text-purple-400 border-purple-800/60'
                            : 'text-gray-500 border-gray-700/60'
                        }`}
                      >
                        {c.building.tierMultiplier}x cost
                      </span>
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
                      <div className="flex flex-col shrink-0">
                        <button
                          onClick={() => stepLevel(c, 1)}
                          disabled={c.level >= c.building.maxLevel}
                          aria-label={`${c.building.name} level up`}
                          className={`${arrowBtnCls} rounded-t border-b-0`}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => stepLevel(c, -1)}
                          disabled={c.level <= 1}
                          aria-label={`${c.building.name} level down`}
                          className={`${arrowBtnCls} rounded-b`}
                        >
                          ▼
                        </button>
                      </div>
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
                      <div className="flex flex-col shrink-0">
                        <button
                          onClick={() => stepLevel(c, 1)}
                          disabled={c.level >= c.building.maxLevel}
                          aria-label={`${c.building.name} level up`}
                          className={`${arrowBtnCls} rounded-t border-b-0`}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => stepLevel(c, -1)}
                          disabled={c.level <= 1}
                          aria-label={`${c.building.name} level down`}
                          className={`${arrowBtnCls} rounded-b`}
                        >
                          ▼
                        </button>
                      </div>
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
    </div>
  );
}
