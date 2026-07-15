import { useState, useEffect, useCallback, useRef } from 'react';
import { parseCSV } from '../utils/csvParser';

const SHEET_ID = '1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c';
// The gviz CSV endpoint drops the merged building-name cells on this tab, so
// fetch via the export endpoint with the tab's gid instead.
const BUILDINGS_GID = '460010172';
const CACHE_KEY = 'st_buildings_cache_v2';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const LEGACY_CACHE_KEYS = ['st_buildings_cache_v1'];

export interface BuildingLevel {
  level: number;
  /** Ticks required to go from the previous level to this one. */
  ticks: number;
  effect: string;
}

export interface Building {
  name: string;
  prerequisite: string;
  tierMultiplier: number;
  levels: BuildingLevel[];
  maxLevel: number;
}

interface CachedBuildings {
  buildings: Building[];
  timestamp: number;
}

function titleCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/(^|[\s(])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
}

/**
 * The Buildings tab is a series of stacked blocks, one per building:
 *   ,TOWN HALL,,Prerequisite: None
 *   ,,,Building Tier Multiplier: x1
 *   ,Level,Ticks Needed,Building Level Effect
 *   ,1,---,---
 *   ,2,10,City Population Limit: 5
 *   ...
 */
function parseBuildings(rows: string[][]): Building[] {
  const buildings: Building[] = [];
  let current: Building | null = null;
  let prevCumulative = 0;

  for (const row of rows) {
    const c1 = row[1]?.trim() ?? '';
    const c2 = row[2]?.trim() ?? '';
    const c3 = row[3]?.trim() ?? '';

    if (c1 && c1 !== 'Level' && !/^\d/.test(c1) && c3.startsWith('Prerequisite:')) {
      current = {
        name: titleCase(c1),
        prerequisite: c3.replace('Prerequisite:', '').trim(),
        tierMultiplier: 1,
        levels: [],
        maxLevel: 1,
      };
      buildings.push(current);
      prevCumulative = 0;
      continue;
    }
    if (!current) continue;

    const multMatch = c3.match(/Multiplier:\s*x(\d+)/);
    if (multMatch) {
      current.tierMultiplier = parseInt(multMatch[1]);
      continue;
    }

    if (/^\d+$/.test(c1)) {
      // The sheet's "Ticks Needed" is the cumulative total to reach that
      // level; store the per-level delta instead.
      const cumulative = parseInt(c2.replace(/,/g, '')) || 0;
      current.levels.push({
        level: parseInt(c1),
        ticks: Math.max(0, cumulative - prevCumulative),
        effect: c3 === '---' ? '' : c3,
      });
      current.maxLevel = parseInt(c1);
      prevCumulative = cumulative;
    }
  }

  return buildings.filter(b => b.levels.length > 1);
}

function readCache(): { buildings: Building[]; isFresh: boolean } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { buildings: [], isFresh: false };
    const cached: CachedBuildings = JSON.parse(raw);
    const isFresh = cached.buildings.length > 0 && (Date.now() - cached.timestamp) < CACHE_TTL;
    return { buildings: cached.buildings, isFresh };
  } catch {
    return { buildings: [], isFresh: false };
  }
}

export function useBuildings() {
  const init = useRef(readCache());
  const [buildings, setBuildings] = useState<Building[]>(init.current.buildings);
  const [loading, setLoading] = useState(!init.current.isFresh);
  const [error, setError] = useState<string | null>(null);

  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${BUILDINGS_GID}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseBuildings(parseCSV(text));
      if (parsed.length === 0) throw new Error('No buildings found — sheet may be formatted differently.');
      LEGACY_CACHE_KEYS.forEach(k => localStorage.removeItem(k));
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ buildings: parsed, timestamp: Date.now() } satisfies CachedBuildings));
      } catch {
        // Quota exceeded — app still works, just won't cache this session.
      }
      setBuildings(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!init.current.isFresh) fetchBuildings();
  }, [fetchBuildings]);

  return { buildings, loading, error, refresh: fetchBuildings };
}
