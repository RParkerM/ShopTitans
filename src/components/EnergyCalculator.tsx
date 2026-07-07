import { useEffect, useState } from 'react';

interface ItemInputs {
  name: string;
  value: string;
  surchargeMult: string;
  surchargeEnergy: string;
  discountEnergy: string;
}

const DEFAULT_ITEM: ItemInputs = {
  name: '',
  value: '',
  surchargeMult: '1',
  surchargeEnergy: '',
  discountEnergy: '',
};

const STORAGE_KEY = 'st_energy_calc';

function loadItems(): [ItemInputs, ItemInputs] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 2) {
        return [
          { ...DEFAULT_ITEM, ...parsed[0] },
          { ...DEFAULT_ITEM, ...parsed[1] },
        ];
      }
    }
  } catch {
    // fall through to defaults
  }
  return [{ ...DEFAULT_ITEM }, { ...DEFAULT_ITEM }];
}

function parseNum(raw: string): number | null {
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface ItemStats {
  value: number | null;
  mult: number | null;
  surchargeEnergy: number | null;
  discountEnergy: number | null;
  /** Extra gold vs a normal sale: value × mult */
  surchargeExtraGold: number | null;
  /** Total gold received when surcharging: value × (1 + mult) */
  surchargeTotalGold: number | null;
  /** Gold given up vs a normal sale: value × 0.5 (never multiplied) */
  discountLoss: number | null;
  /** Extra gold gained per energy spent surcharging */
  goldPerEnergy: number | null;
  /** Gold given up per energy gained discounting */
  lossPerEnergy: number | null;
}

function computeStats(item: ItemInputs): ItemStats {
  const value = parseNum(item.value);
  const mult = parseNum(item.surchargeMult);
  const surchargeEnergy = parseNum(item.surchargeEnergy);
  const discountEnergy = parseNum(item.discountEnergy);

  const surchargeExtraGold = value !== null && mult !== null ? value * mult : null;
  const surchargeTotalGold = value !== null && mult !== null ? value * (1 + mult) : null;
  const discountLoss = value !== null ? value * 0.5 : null;

  return {
    value,
    mult,
    surchargeEnergy,
    discountEnergy,
    surchargeExtraGold,
    surchargeTotalGold,
    discountLoss,
    goldPerEnergy:
      surchargeExtraGold !== null && surchargeEnergy !== null
        ? surchargeExtraGold / surchargeEnergy
        : null,
    lossPerEnergy:
      discountLoss !== null && discountEnergy !== null
        ? discountLoss / discountEnergy
        : null,
  };
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 0 : 1 });
}

function ItemPanel({
  label,
  item,
  stats,
  onChange,
}: {
  label: string;
  item: ItemInputs;
  stats: ItemStats;
  onChange: (patch: Partial<ItemInputs>) => void;
}) {
  const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/60';

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
      <input
        type="text"
        value={item.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder={label}
        className="bg-transparent border-b border-gray-700 pb-1 text-sm font-semibold text-amber-400 placeholder-amber-400/50 focus:outline-none focus:border-amber-500/60"
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Item value (gold)</span>
          <input
            type="number"
            min="0"
            value={item.value}
            onChange={e => onChange({ value: e.target.value })}
            placeholder="e.g. 100000"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Surcharge multiplier</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={item.surchargeMult}
            onChange={e => onChange({ surchargeMult: e.target.value })}
            placeholder="1"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Energy cost to surcharge</span>
          <input
            type="number"
            min="0"
            value={item.surchargeEnergy}
            onChange={e => onChange({ surchargeEnergy: e.target.value })}
            placeholder="e.g. 50"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Energy gained on discount</span>
          <input
            type="number"
            min="0"
            value={item.discountEnergy}
            onChange={e => onChange({ discountEnergy: e.target.value })}
            placeholder="e.g. 30"
            className={inputCls}
          />
        </label>
      </div>

      <div className="border-t border-gray-700 pt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <span className="text-gray-500">Surcharge sale</span>
        <span className="text-right text-gray-200">
          {stats.surchargeTotalGold !== null ? `${fmt(stats.surchargeTotalGold)} gold` : '—'}
        </span>
        <span className="text-gray-500">Extra gold vs normal sale</span>
        <span className="text-right text-green-400">
          {stats.surchargeExtraGold !== null ? `+${fmt(stats.surchargeExtraGold)}` : '—'}
        </span>
        <span className="text-gray-500">Extra gold per energy spent</span>
        <span className="text-right text-green-400">
          {stats.goldPerEnergy !== null ? fmt(stats.goldPerEnergy) : '—'}
        </span>
        <span className="text-gray-500">Discount sale (50%)</span>
        <span className="text-right text-gray-200">
          {stats.discountLoss !== null ? `${fmt(stats.discountLoss)} gold` : '—'}
        </span>
        <span className="text-gray-500">Gold given up on discount</span>
        <span className="text-right text-red-400">
          {stats.discountLoss !== null ? `−${fmt(stats.discountLoss)}` : '—'}
        </span>
        <span className="text-gray-500">Gold given up per energy gained</span>
        <span className="text-right text-red-400">
          {stats.lossPerEnergy !== null ? fmt(stats.lossPerEnergy) : '—'}
        </span>
      </div>
    </div>
  );
}

function ComparisonRow({
  discounter,
  surcharger,
  discounterLabel,
  surchargerLabel,
}: {
  discounter: ItemStats;
  surcharger: ItemStats;
  discounterLabel: string;
  surchargerLabel: string;
}) {
  const ready =
    discounter.discountLoss !== null &&
    discounter.discountEnergy !== null &&
    surcharger.surchargeExtraGold !== null &&
    surcharger.surchargeEnergy !== null;

  if (!ready) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-500">
        <div className="text-sm font-medium text-gray-300 mb-1">
          Discount {discounterLabel} → Surcharge {surchargerLabel}
        </div>
        Fill in {discounterLabel}&apos;s value and discount energy, and {surchargerLabel}&apos;s
        value, multiplier, and surcharge energy.
      </div>
    );
  }

  const discountsPerSurcharge = surcharger.surchargeEnergy! / discounter.discountEnergy!;
  const goldLost = discountsPerSurcharge * discounter.discountLoss!;
  const netGold = surcharger.surchargeExtraGold! - goldLost;
  const worth = netGold > 0;

  return (
    <div
      className={`border rounded-lg p-4 ${
        worth ? 'bg-green-900/20 border-green-800/60' : 'bg-red-900/20 border-red-800/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-gray-200">
          Discount {discounterLabel} → Surcharge {surchargerLabel}
        </span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            worth ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {worth ? 'WORTH IT' : 'NOT WORTH IT'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-gray-500">Discounts needed per surcharge</span>
        <span className="text-right text-gray-200">{fmt(discountsPerSurcharge)}</span>
        <span className="text-gray-500">Gold given up discounting</span>
        <span className="text-right text-red-400">−{fmt(goldLost)}</span>
        <span className="text-gray-500">Extra gold from surcharge</span>
        <span className="text-right text-green-400">+{fmt(surcharger.surchargeExtraGold!)}</span>
        <span className="text-gray-500 font-medium">Net gold per surcharge</span>
        <span
          className={`text-right font-bold ${worth ? 'text-green-400' : 'text-red-400'}`}
        >
          {netGold >= 0 ? '+' : '−'}{fmt(Math.abs(netGold))}
        </span>
      </div>
    </div>
  );
}

export function EnergyCalculator() {
  const [items, setItems] = useState<[ItemInputs, ItemInputs]>(loadItems);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const updateItem = (index: 0 | 1) => (patch: Partial<ItemInputs>) => {
    setItems(prev => {
      const next: [ItemInputs, ItemInputs] = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const stats: [ItemStats, ItemStats] = [computeStats(items[0]), computeStats(items[1])];
  const labels = [items[0].name.trim() || 'Item 1', items[1].name.trim() || 'Item 2'];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        Surcharging sells an item for its value × (1 + multiplier) at the cost of energy.
        Discounting sells it for 50% of its value (never multiplied) and grants energy.
        Enter two items to see whether discounting one to fund surcharging the other pays off.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <ItemPanel label="Item 1" item={items[0]} stats={stats[0]} onChange={updateItem(0)} />
        <ItemPanel label="Item 2" item={items[1]} stats={stats[1]} onChange={updateItem(1)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ComparisonRow
          discounter={stats[0]}
          surcharger={stats[1]}
          discounterLabel={labels[0]}
          surchargerLabel={labels[1]}
        />
        <ComparisonRow
          discounter={stats[1]}
          surcharger={stats[0]}
          discounterLabel={labels[1]}
          surchargerLabel={labels[0]}
        />
      </div>
    </div>
  );
}
