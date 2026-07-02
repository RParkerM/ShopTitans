import { useMemo } from 'react';
import { MAIN_CATEGORIES, SUBCATEGORIES, type MainCategory } from '../utils/categories';
import type { Blueprint, UserBlueprintData } from '../types';

interface SummaryRowDef {
  label: string;
  icon: string;
  type: string;       // matches bp.type
  category: Exclude<MainCategory, 'All'>;
  subValue: string | null; // value passed to sub-type filter when clicked (null = whole category)
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
      subValue: sub.value,
    })),
  )
  .concat([
    {
      label: 'Elements',
      icon: '/fan-kit/Item%20Types/icon_global_item_fire_big.png',
      type: 'Element',
      category: 'Enchantments',
      subValue: null,
    },
    {
      label: 'Spirits',
      icon: '/fan-kit/Item%20Types/icon_global_item_spirit_big.png',
      type: 'Spirit',
      category: 'Enchantments',
      subValue: 'Spirit',
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
  onSelectSubType: (category: MainCategory, subType: string | null) => void;
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

export function AscensionSummary({ blueprints, getUserData, onSelectSubType }: AscensionSummaryProps) {
  const statsByType = useMemo(() => {
    const map = new Map<string, TypeStats>();
    for (const bp of blueprints) {
      const maxStars = Math.min(bp.ascensionUpgrades.length, 3);
      if (maxStars === 0) continue; // not ascendable
      let stats = map.get(bp.type);
      if (!stats) {
        stats = { earned: 0, ownedMax: 0, totalMax: 0 };
        map.set(bp.type, stats);
      }
      stats.totalMax += maxStars;
      const data = getUserData(bp.name);
      if (data.owned) {
        stats.ownedMax += maxStars;
        stats.earned += Math.min(data.ascensionLevel, maxStars);
      }
    }
    return map;
  }, [blueprints, getUserData]);

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
            {rows.map(row => (
              <button
                key={row.type}
                onClick={() => onSelectSubType(row.category, row.subValue)}
                title={`View ${row.label} blueprints`}
                className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 hover:border-gray-500 transition-colors text-left"
              >
                <img src={row.icon} alt="" className="h-7 w-7 object-contain shrink-0" />
                <span className="text-xs font-medium text-gray-300 w-28 shrink-0">{row.label}</span>
                <div className="flex-1 min-w-0">
                  <ProgressBar value={row.stats.earned} max={row.stats.ownedMax} />
                </div>
                <StatLine stats={row.stats} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
