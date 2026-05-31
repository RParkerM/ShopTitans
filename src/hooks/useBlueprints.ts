import { useState, useEffect, useCallback, useRef } from 'react';
import type { Blueprint } from '../types';
import { parseCSV } from '../utils/csvParser';

const SHEET_ID = '1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c';
const CACHE_KEY = 'st_blueprints_cache_v2';
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CachedBlueprints {
  blueprints: Blueprint[];
  timestamp: number;
}

function parseBlueprints(rows: string[][]): Blueprint[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());

  const nameIdx        = headers.indexOf('Name');
  const typeIdx        = headers.indexOf('Type');
  const tierIdx        = headers.indexOf('Tier');
  const sourceIdx      = headers.indexOf('Unlock Prerequisite');
  const valueIdx       = headers.indexOf('Value');
  const atkIdx         = headers.indexOf('ATK');
  const defIdx         = headers.indexOf('DEF');
  const hpIdx          = headers.indexOf('HP');
  const evaIdx         = headers.indexOf('EVA');
  const critIdx        = headers.indexOf('CRIT');
  const favorIdx       = headers.indexOf('Favor');
  const airshipIdx     = headers.indexOf('Airship Power');

  const ironIdx      = airshipIdx + 9;
  const woodIdx      = ironIdx + 1;
  const leatherIdx   = woodIdx + 1;
  const herbsIdx     = leatherIdx + 1;
  const steelIdx     = herbsIdx + 1;
  const ironwoodIdx  = steelIdx + 1;
  const fabricIdx    = ironwoodIdx + 1;
  const oilIdx       = fabricIdx + 1;
  const etherIdx     = oilIdx + 1;
  const jewelsIdx    = etherIdx + 1;
  const essenceIdx   = jewelsIdx + 1;
  const stardustIdx  = essenceIdx + 1;

  if (nameIdx === -1 || typeIdx === -1) return [];

  const craftingUpgradeIdxs: number[] = [];
  const starforgedMilestoneIdxs: number[] = [];
  const ascensionUpgradeIdxs: number[] = [];

  for (let i = 1; i <= 5; i++) {
    craftingUpgradeIdxs.push(headers.indexOf(`Crafting Upgrade ${i}`));
    starforgedMilestoneIdxs.push(headers.indexOf(`Starforged Milestone ${i}`));
  }
  for (let i = 1; i <= 3; i++) {
    ascensionUpgradeIdxs.push(headers.indexOf(`Ascension Upgrade ${i}`));
  }

  const blueprints: Blueprint[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = row[nameIdx]?.trim();
    const type = row[typeIdx]?.trim();

    if (!name || !type || name === 'Name' || type === 'Type') continue;

    const tier   = parseInt(row[tierIdx]?.trim()) || 0;
    const source = (sourceIdx !== -1 ? row[sourceIdx]?.trim() : '') || '---';

    const resolvedType = type !== 'Enchantment' ? type
      : name.endsWith(' Spirit') ? 'Spirit'
      : 'Element';

    const num = (idx: number) => idx !== -1 ? (parseFloat(row[idx]?.trim()) || 0) : 0;

    const craftingMilestones = craftingUpgradeIdxs
      .map(idx => {
        if (idx === -1) return null;
        const reward = row[idx]?.trim() ?? '';
        const craftsNeeded = parseInt(row[idx + 1]?.trim()) || 0;
        if (!reward || reward === '---' || craftsNeeded === 0) return null;
        return { reward, craftsNeeded };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    const starforgedMilestones = starforgedMilestoneIdxs
      .map(idx => {
        if (idx === -1) return null;
        const reward = row[idx]?.trim() ?? '';
        const craftsNeeded = parseInt(row[idx + 1]?.trim()) || 0;
        if (!reward || reward === '---' || craftsNeeded === 0) return null;
        return { reward, craftsNeeded };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    const ascensionUpgrades = ascensionUpgradeIdxs
      .map(idx => {
        if (idx === -1) return null;
        const description = row[idx]?.trim() ?? '';
        const shardCost = parseInt(row[idx + 1]?.trim()) || 0;
        if (!description || description === '---') return null;
        return { description, shardCost };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    blueprints.push({
      name, type: resolvedType, tier, source,
      value: num(valueIdx), atk: num(atkIdx), def: num(defIdx), hp: num(hpIdx),
      eva: num(evaIdx), crit: num(critIdx), favor: num(favorIdx), airshipPower: num(airshipIdx),
      craftingMilestones, starforgedMilestones, ascensionUpgrades,
      resources: {
        iron:     num(ironIdx),
        wood:     num(woodIdx),
        leather:  num(leatherIdx),
        herbs:    num(herbsIdx),
        steel:    num(steelIdx),
        ironwood: num(ironwoodIdx),
        fabric:   num(fabricIdx),
        oil:      num(oilIdx),
        ether:    num(etherIdx),
        jewels:   num(jewelsIdx),
        essence:  num(essenceIdx),
        stardust: num(stardustIdx),
      },
    });
  }

  return blueprints;
}

// Read the cache once synchronously so initial state reflects what's already stored.
function readCache(): { blueprints: Blueprint[]; isFresh: boolean } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { blueprints: [], isFresh: false };
    const cached: CachedBlueprints = JSON.parse(raw);
    const isFresh = cached.blueprints.length > 0 && (Date.now() - cached.timestamp) < CACHE_TTL;
    return { blueprints: cached.blueprints, isFresh };
  } catch {
    return { blueprints: [], isFresh: false };
  }
}

export function useBlueprints() {
  // Initialise synchronously — no loading flash when fresh cache exists.
  const init = useRef(readCache());
  const [blueprints, setBlueprints] = useState<Blueprint[]>(init.current.blueprints);
  const [loading, setLoading]       = useState(!init.current.isFresh);
  const [error, setError]           = useState<string | null>(null);

  const fetchBlueprints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Blueprints`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = parseCSV(text);
      const parsed = parseBlueprints(rows);
      if (parsed.length === 0) throw new Error('No blueprints found — sheet may be empty or formatted differently.');
      localStorage.setItem(CACHE_KEY, JSON.stringify({ blueprints: parsed, timestamp: Date.now() } satisfies CachedBlueprints));
      setBlueprints(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Stale data (if any) is already in state from init — nothing extra needed.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only hit the network if the cache was stale or missing on mount.
    if (!init.current.isFresh) fetchBlueprints();
  }, [fetchBlueprints]);

  return { blueprints, loading, error, refresh: fetchBlueprints };
}
