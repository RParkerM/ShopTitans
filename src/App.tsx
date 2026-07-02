import { useMemo, useState, useEffect, useRef } from 'react';
import { useDebounce } from './hooks/useDebounce';
import { useBlueprints } from './hooks/useBlueprints';
import { useUserData } from './hooks/useUserData';
import { FilterBar } from './components/FilterBar';
import { BlueprintTable } from './components/BlueprintTable';
import { AscensionSummary } from './components/AscensionSummary';
import { BlueprintModal } from './components/BlueprintModal';
import { MAIN_CATEGORIES, TYPE_TO_CATEGORY, TYPE_SORT_ORDER, getEnchantmentElement, type MainCategory } from './utils/categories';
import { RESOURCE_DEFS } from './utils/resources';
import { STANDARD_COMPONENT_ICONS } from './utils/components';
import { getMilestoneStatus } from './utils/milestones';
import type { Blueprint, ResourceKey, ResourceFilters, ComponentFilters } from './types';

export type SortOrder = 'new' | 'old' | 'tier-desc' | 'tier-asc' | 'type';
export type MasteredFilter = 'all' | 'mastered' | 'not-mastered';
export type View = 'blueprints' | 'ascensions';
const VALID_SORTS: SortOrder[] = ['new', 'old', 'tier-desc', 'tier-asc', 'type'];
const VALID_CATEGORIES = MAIN_CATEGORIES.map(c => c.id);

const VALID_RESOURCE_KEYS = new Set(RESOURCE_DEFS.map(r => r.key));

function parseResourceFilters(raw: string): ResourceFilters {
  const result: ResourceFilters = {};
  if (!raw) return result;
  for (const part of raw.split(',')) {
    const [key, state] = part.split(':');
    if (VALID_RESOURCE_KEYS.has(key as ResourceKey) && (state === 'r' || state === 'e')) {
      result[key as ResourceKey] = state === 'r' ? 'require' : 'exclude';
    }
  }
  return result;
}

function serializeResourceFilters(filters: ResourceFilters): string {
  return Object.entries(filters)
    .map(([k, v]) => `${k}:${v === 'require' ? 'r' : 'e'}`)
    .join(',');
}

function parseComponentFilters(raw: string): ComponentFilters {
  const result: ComponentFilters = {};
  if (!raw) return result;
  for (const part of raw.split(',')) {
    const colonIdx = part.lastIndexOf(':');
    if (colonIdx === -1) continue;
    const name = part.slice(0, colonIdx);
    const state = part.slice(colonIdx + 1);
    if (name && (state === 'r' || state === 'e')) {
      result[name] = state === 'r' ? 'require' : 'exclude';
    }
  }
  return result;
}

function serializeComponentFilters(filters: ComponentFilters): string {
  return Object.entries(filters)
    .map(([k, v]) => `${k}:${v === 'require' ? 'r' : 'e'}`)
    .join(',');
}

function parseMasteredFilter(raw: string | null): MasteredFilter {
  if (raw === '1') return 'mastered';
  if (raw === '0') return 'not-mastered';
  return 'all';
}

function readURLFilters() {
  const p = new URLSearchParams(window.location.search);
  const cat = p.get('category') ?? '';
  const sort = p.get('sort') ?? '';
  return {
    view:            (p.get('view') === 'ascensions' ? 'ascensions' : 'blueprints') as View,
    category:        (VALID_CATEGORIES.includes(cat as MainCategory) ? cat : 'All') as MainCategory,
    subTypes:        new Set((p.get('sub') ?? '').split(',').filter(Boolean)),
    search:          p.get('q') ?? '',
    ownedOnly:       p.get('owned') === '1',
    sort:            (VALID_SORTS.includes(sort as SortOrder) ? sort
                      : (localStorage.getItem('st_sort') ?? 'new')) as SortOrder,
    resourceFilters:   parseResourceFilters(p.get('res') ?? ''),
    componentFilters:  parseComponentFilters(p.get('comp') ?? ''),
    masteredFilter:    parseMasteredFilter(p.get('mastered')),
  };
}

export default function App() {
  const { blueprints, loading, error, refresh } = useBlueprints();
  const { get, update } = useUserData();

  const init = useRef(readURLFilters()).current;
  const [view, setView] = useState<View>(init.view);
  const [selectedCategory, setSelectedCategory] = useState<MainCategory>(init.category);
  const [selectedSubTypes, setSelectedSubTypes] = useState<Set<string>>(init.subTypes);
  const [search, setSearch] = useState(init.search);
  const [showOwnedOnly, setShowOwnedOnly] = useState(init.ownedOnly);
  const [sort, setSort] = useState<SortOrder>(init.sort);
  const [resourceFilters, setResourceFilters] = useState<ResourceFilters>(init.resourceFilters);
  const [componentFilters, setComponentFilters] = useState<ComponentFilters>(init.componentFilters);
  const [masteredFilter, setMasteredFilter] = useState<MasteredFilter>(init.masteredFilter);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [selectedBlueprintTab, setSelectedBlueprintTab] = useState<'milestones' | undefined>(undefined);

  const debouncedCategory = useDebounce(selectedCategory, 100);
  const debouncedSubTypes = useDebounce(selectedSubTypes, 100);
  const debouncedSearch = useDebounce(search, 100);
  const debouncedShowOwnedOnly = useDebounce(showOwnedOnly, 100);
  const debouncedResourceFilters = useDebounce(resourceFilters, 100);
  const debouncedComponentFilters = useDebounce(componentFilters, 100);
  const debouncedMasteredFilter = useDebounce(masteredFilter, 100);

  useEffect(() => {
    const p = new URLSearchParams();
    if (view !== 'blueprints')      p.set('view', view);
    if (selectedCategory !== 'All') p.set('category', selectedCategory);
    if (selectedSubTypes.size > 0)  p.set('sub', [...selectedSubTypes].join(','));
    if (search)                     p.set('q', search);
    if (showOwnedOnly)              p.set('owned', '1');
    if (sort !== 'new')             p.set('sort', sort);
    const resSerialized = serializeResourceFilters(resourceFilters);
    if (resSerialized)              p.set('res', resSerialized);
    const compSerialized = serializeComponentFilters(componentFilters);
    if (compSerialized)             p.set('comp', compSerialized);
    if (masteredFilter === 'mastered')     p.set('mastered', '1');
    if (masteredFilter === 'not-mastered') p.set('mastered', '0');
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [view, selectedCategory, selectedSubTypes, search, showOwnedOnly, sort, resourceFilters, componentFilters, masteredFilter]);

  function handleSortChange(v: SortOrder) {
    setSort(v);
    localStorage.setItem('st_sort', v);
  }

  function handleCategoryChange(category: MainCategory) {
    setSelectedCategory(category);
    setSelectedSubTypes(new Set());
  }

  function handleSubTypeChange(value: string, shiftKey: boolean) {
    setSelectedSubTypes(prev => {
      if (shiftKey) {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      }
      // Normal click: if already the sole selection, clear it; otherwise select only this one
      if (prev.size === 1 && prev.has(value)) return new Set();
      return new Set([value]);
    });
  }

  function handleResourceFilterCycle(key: ResourceKey) {
    setResourceFilters(prev => {
      const current = prev[key];
      if (!current) return { ...prev, [key]: 'require' };
      if (current === 'require') return { ...prev, [key]: 'exclude' };
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleResourceFiltersReset() {
    setResourceFilters({});
  }

  function handleComponentFilterCycle(name: string) {
    setComponentFilters(prev => {
      const current = prev[name];
      if (!current) return { ...prev, [name]: 'require' };
      if (current === 'require') return { ...prev, [name]: 'exclude' };
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleComponentFiltersReset() {
    setComponentFilters({});
  }

  function handleAscensionRowClick(category: MainCategory, subType: string | null) {
    setSelectedCategory(category);
    setSelectedSubTypes(subType ? new Set([subType]) : new Set());
    setView('blueprints');
  }

  const allComponentNames = useMemo(() => {
    const names = new Set<string>();
    for (const bp of blueprints) {
      for (const comp of bp.components) {
        if (comp.name in STANDARD_COMPONENT_ICONS) names.add(comp.name);
      }
    }
    return [...names].sort();
  }, [blueprints]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const resEntries = Object.entries(debouncedResourceFilters) as [ResourceKey, 'require' | 'exclude'][];
    const compEntries = Object.entries(debouncedComponentFilters) as [string, 'require' | 'exclude'][];
    return blueprints.filter(bp => {
      if (debouncedCategory !== 'All') {
        if (TYPE_TO_CATEGORY[bp.type] !== debouncedCategory) return false;
        if (debouncedSubTypes.size > 0) {
          if (debouncedCategory === 'Enchantments') {
            if (!debouncedSubTypes.has(getEnchantmentElement(bp.name, bp.type))) return false;
          } else {
            if (!debouncedSubTypes.has(bp.type)) return false;
          }
        }
      }
      if (q && !bp.name.toLowerCase().includes(q)) return false;
      if (debouncedShowOwnedOnly && !get(bp.name).owned) return false;
      if (debouncedMasteredFilter !== 'all') {
        const { allComplete } = getMilestoneStatus(get(bp.name).craftCount, bp.craftingMilestones);
        if (debouncedMasteredFilter === 'mastered' && !allComplete) return false;
        if (debouncedMasteredFilter === 'not-mastered' && allComplete) return false;
      }
      for (const [key, state] of resEntries) {
        const has = bp.resources[key] > 0;
        if (state === 'require' && !has) return false;
        if (state === 'exclude' && has) return false;
      }
      for (const [name, state] of compEntries) {
        const has = bp.components.some(c => c.name === name);
        if (state === 'require' && !has) return false;
        if (state === 'exclude' && has) return false;
      }
      return true;
    });
  }, [blueprints, debouncedCategory, debouncedSubTypes, debouncedSearch, debouncedShowOwnedOnly, get, debouncedResourceFilters, debouncedComponentFilters, debouncedMasteredFilter]);

  const sorted = useMemo(() => {
    switch (sort) {
      case 'old':       return [...filtered];
      case 'new':       return [...filtered].reverse();
      case 'tier-asc':  return [...filtered].sort((a, b) => a.tier - b.tier);
      case 'tier-desc': return [...filtered].sort((a, b) => b.tier - a.tier);
      case 'type':      return [...filtered].sort((a, b) => {
        const ta = TYPE_SORT_ORDER[a.type] ?? 999;
        const tb = TYPE_SORT_ORDER[b.type] ?? 999;
        return ta !== tb ? ta - tb : a.tier - b.tier;
      });
    }
  }, [filtered, sort]);

  const ownedCount = useMemo(
    () => blueprints.filter(bp => get(bp.name).owned).length,
    [blueprints, get],
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-amber-400 leading-tight">
            Shop Titans Blueprint Tracker
          </h1>
          {blueprints.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {ownedCount} / {blueprints.length} owned
            </p>
          )}
        </div>
        {blueprints.length > 0 && (
          <div className="flex items-center rounded overflow-hidden border border-gray-700 text-xs">
            {([['blueprints', 'Blueprints'], ['ascensions', 'Ascensions']] as [View, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
                  view === value
                    ? 'bg-amber-500 text-gray-900 font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 border border-gray-700 rounded hover:border-gray-600 disabled:opacity-40"
        >
          {loading ? 'Loading…' : '↻ Refresh Data'}
        </button>
      </header>

      {loading && blueprints.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-2">
          <div className="text-sm">Fetching blueprints from Google Sheets…</div>
        </div>
      )}

      {error && !loading && blueprints.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs max-w-sm text-center">
            Make sure the Google Sheet is shared publicly (anyone with the link can view). This app fetches blueprint data directly from the sheet.
          </p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-gray-800 rounded text-sm hover:bg-gray-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {error && !loading && blueprints.length > 0 && (
        <div className="bg-yellow-900/30 border-b border-yellow-800/50 px-4 py-2 text-xs text-yellow-400">
          Using cached data — live refresh failed: {error}
        </div>
      )}

      {blueprints.length > 0 && view === 'ascensions' && (
        <AscensionSummary
          blueprints={blueprints}
          getUserData={get}
          onSelectSubType={handleAscensionRowClick}
        />
      )}

      {blueprints.length > 0 && view === 'blueprints' && (
        <>
          <FilterBar
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            selectedSubTypes={selectedSubTypes}
            onSubTypeChange={handleSubTypeChange}
            search={search}
            onSearchChange={setSearch}
            showOwnedOnly={showOwnedOnly}
            onShowOwnedOnlyChange={setShowOwnedOnly}
            sort={sort}
            onSortChange={handleSortChange}
            resourceFilters={resourceFilters}
            onResourceFilterCycle={handleResourceFilterCycle}
            onResourceFiltersReset={handleResourceFiltersReset}
            masteredFilter={masteredFilter}
            onMasteredFilterChange={setMasteredFilter}
            allComponentNames={allComponentNames}
            componentFilters={componentFilters}
            onComponentFilterCycle={handleComponentFilterCycle}
            onComponentFiltersReset={handleComponentFiltersReset}
          />
          <BlueprintTable
            blueprints={sorted}
            getUserData={get}
            onUpdate={update}
            onCardClick={(bp, tab) => { setSelectedBlueprint(bp); setSelectedBlueprintTab(tab); }}
          />
        </>
      )}

      {selectedBlueprint && (
        <BlueprintModal
          blueprint={selectedBlueprint}
          blueprints={sorted}
          data={get(selectedBlueprint.name)}
          onUpdate={update}
          onNavigate={setSelectedBlueprint}
          onClose={() => { setSelectedBlueprint(null); setSelectedBlueprintTab(undefined); }}
          initialTab={selectedBlueprintTab}
        />
      )}
    </div>
  );
}
