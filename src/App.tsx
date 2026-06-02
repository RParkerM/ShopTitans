import { useMemo, useState, useEffect, useRef } from 'react';
import { useBlueprints } from './hooks/useBlueprints';
import { useUserData } from './hooks/useUserData';
import { FilterBar } from './components/FilterBar';
import { BlueprintTable } from './components/BlueprintTable';
import { BlueprintModal } from './components/BlueprintModal';
import { MAIN_CATEGORIES, TYPE_TO_CATEGORY, getEnchantmentElement, type MainCategory } from './utils/categories';
import type { Blueprint } from './types';

export type SortOrder = 'new' | 'old' | 'tier-desc' | 'tier-asc';
const VALID_SORTS: SortOrder[] = ['new', 'old', 'tier-desc', 'tier-asc'];
const VALID_CATEGORIES = MAIN_CATEGORIES.map(c => c.id);

function readURLFilters() {
  const p = new URLSearchParams(window.location.search);
  const cat = p.get('category') ?? '';
  const sort = p.get('sort') ?? '';
  return {
    category:  (VALID_CATEGORIES.includes(cat as MainCategory) ? cat : 'All') as MainCategory,
    subType:   p.get('sub') ?? '',
    search:    p.get('q') ?? '',
    ownedOnly: p.get('owned') === '1',
    sort:      (VALID_SORTS.includes(sort as SortOrder) ? sort
                : (localStorage.getItem('st_sort') ?? 'new')) as SortOrder,
  };
}

export default function App() {
  const { blueprints, loading, error, refresh } = useBlueprints();
  const { get, update } = useUserData();

  const init = useRef(readURLFilters()).current;
  const [selectedCategory, setSelectedCategory] = useState<MainCategory>(init.category);
  const [selectedSubType, setSelectedSubType] = useState(init.subType);
  const [search, setSearch] = useState(init.search);
  const [showOwnedOnly, setShowOwnedOnly] = useState(init.ownedOnly);
  const [sort, setSort] = useState<SortOrder>(init.sort);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCategory !== 'All') p.set('category', selectedCategory);
    if (selectedSubType)            p.set('sub', selectedSubType);
    if (search)                     p.set('q', search);
    if (showOwnedOnly)              p.set('owned', '1');
    if (sort !== 'new')             p.set('sort', sort);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [selectedCategory, selectedSubType, search, showOwnedOnly, sort]);

  function handleSortChange(v: SortOrder) {
    setSort(v);
    localStorage.setItem('st_sort', v);
  }

  function handleCategoryChange(category: MainCategory) {
    setSelectedCategory(category);
    setSelectedSubType('');
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return blueprints.filter(bp => {
      if (selectedCategory !== 'All') {
        if (TYPE_TO_CATEGORY[bp.type] !== selectedCategory) return false;
        if (selectedSubType) {
          if (selectedCategory === 'Enchantments') {
            if (getEnchantmentElement(bp.name, bp.type) !== selectedSubType) return false;
          } else {
            if (bp.type !== selectedSubType) return false;
          }
        }
      }
      if (q && !bp.name.toLowerCase().includes(q)) return false;
      if (showOwnedOnly && !get(bp.name).owned) return false;
      return true;
    });
  }, [blueprints, selectedCategory, selectedSubType, search, showOwnedOnly, get]);

  const sorted = useMemo(() => {
    switch (sort) {
      case 'old':       return [...filtered];
      case 'new':       return [...filtered].reverse();
      case 'tier-asc':  return [...filtered].sort((a, b) => a.tier - b.tier);
      case 'tier-desc': return [...filtered].sort((a, b) => b.tier - a.tier);
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

      {blueprints.length > 0 && (
        <>
          <FilterBar
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            selectedSubType={selectedSubType}
            onSubTypeChange={setSelectedSubType}
            search={search}
            onSearchChange={setSearch}
            showOwnedOnly={showOwnedOnly}
            onShowOwnedOnlyChange={setShowOwnedOnly}
            sort={sort}
            onSortChange={handleSortChange}
          />
          <BlueprintTable
            blueprints={sorted}
            getUserData={get}
            onUpdate={update}
            onCardClick={setSelectedBlueprint}
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
          onClose={() => setSelectedBlueprint(null)}
        />
      )}
    </div>
  );
}
