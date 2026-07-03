import { useState } from 'react';
import { MAIN_CATEGORIES, SUBCATEGORIES, type MainCategory } from '../utils/categories';
import { RESOURCE_DEFS } from '../utils/resources';
import { STANDARD_COMPONENT_ICONS } from '../utils/components';
import type { SortOrder, MasteredFilter, OwnedFilter } from '../App';
import type { ResourceFilters, ResourceKey, ComponentFilters } from '../types';

interface FilterBarProps {
  selectedCategory: MainCategory;
  onCategoryChange: (category: MainCategory) => void;
  selectedSubTypes: Set<string>;
  onSubTypeChange: (subType: string, shiftKey: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
  ownedFilter: OwnedFilter;
  onOwnedFilterChange: (v: OwnedFilter) => void;
  sort: SortOrder;
  onSortChange: (v: SortOrder) => void;
  resourceFilters: ResourceFilters;
  onResourceFilterCycle: (key: ResourceKey) => void;
  onResourceFiltersReset: () => void;
  masteredFilter: MasteredFilter;
  onMasteredFilterChange: (v: MasteredFilter) => void;
  allComponentNames: string[];
  componentFilters: ComponentFilters;
  onComponentFilterCycle: (name: string) => void;
  onComponentFiltersReset: () => void;
}

export function FilterBar({
  selectedCategory,
  onCategoryChange,
  selectedSubTypes,
  onSubTypeChange,
  search,
  onSearchChange,
  ownedFilter,
  onOwnedFilterChange,
  sort,
  onSortChange,
  resourceFilters,
  onResourceFilterCycle,
  onResourceFiltersReset,
  masteredFilter,
  onMasteredFilterChange,
  allComponentNames,
  componentFilters,
  onComponentFilterCycle,
  onComponentFiltersReset,
}: FilterBarProps) {
  const subcats = selectedCategory !== 'All' ? SUBCATEGORIES[selectedCategory] : [];
  const activeResourceCount = Object.keys(resourceFilters).length;
  const activeComponentCount = Object.keys(componentFilters).length;
  const hasActiveResourceFilters = activeResourceCount > 0;
  const hasActiveComponentFilters = activeComponentCount > 0;
  const activeFilterCount = activeResourceCount + activeComponentCount;

  // Resource/component filter rows are hidden by default (they dominate small
  // screens). Remember the user's choice; auto-open when filters are active.
  const [expanded, setExpanded] = useState<boolean>(() => {
    const stored = localStorage.getItem('st_filters_expanded');
    if (stored !== null) return stored === '1';
    return activeFilterCount > 0;
  });
  function toggleExpanded() {
    setExpanded(prev => {
      const next = !prev;
      localStorage.setItem('st_filters_expanded', next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="sticky top-[var(--header-h)] z-10 bg-gray-900 border-b border-gray-700 px-4 py-3 flex flex-col gap-2">

      {/* Row 1: search + owned only + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search blueprints…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 flex-1 min-w-[160px]"
        />
        <button
          onClick={() => onOwnedFilterChange(ownedFilter === 'all' ? 'owned' : ownedFilter === 'owned' ? 'not-owned' : 'all')}
          title="Owned — click to show owned, again for not owned, again to clear"
          className={`relative px-2.5 py-1 rounded text-sm font-medium transition-all whitespace-nowrap ${
            ownedFilter === 'owned'
              ? 'ring-2 ring-green-500 bg-green-950/40 text-green-400'
              : ownedFilter === 'not-owned'
              ? 'ring-2 ring-red-600 bg-red-950/40 text-red-400'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          {ownedFilter === 'not-owned' ? 'Not Owned' : 'Owned'}
          {ownedFilter === 'owned' && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] leading-none font-bold">✓</span>
          )}
          {ownedFilter === 'not-owned' && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] leading-none font-bold">✕</span>
          )}
        </button>
        <div className="flex items-center rounded overflow-hidden border border-gray-700 text-xs">
          {([['all', 'All'], ['mastered', 'Mastered'], ['not-mastered', 'Not Mastered']] as [MasteredFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onMasteredFilterChange(value)}
              className={`px-2 py-1 transition-colors whitespace-nowrap ${
                masteredFilter === value
                  ? 'bg-amber-500 text-gray-900 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value as SortOrder)}
          className="ml-auto px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
          <option value="tier-desc">Tier ↓</option>
          <option value="tier-asc">Tier ↑</option>
          <option value="type">By type</option>
        </select>
      </div>

      {/* Row 2: main category icons */}
      <div className="flex flex-wrap gap-1.5">
        {MAIN_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            title={cat.label}
            className={`rounded transition-all ${
              selectedCategory === cat.id
                ? 'opacity-100 ring-2 ring-amber-500 ring-offset-1 ring-offset-gray-900'
                : 'opacity-40 hover:opacity-70'
            }`}
          >
            <img src={cat.icon} alt={cat.label} className="h-9 w-auto" />
          </button>
        ))}
      </div>

      {/* Row 3: subcategory icon+label buttons — only when a specific category is selected */}
      {subcats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subcats.map(sub => (
            <button
              key={sub.value}
              onClick={e => onSubTypeChange(sub.value, e.shiftKey)}
              title={`${sub.label} — shift+click to select multiple`}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-colors leading-tight ${
                selectedSubTypes.has(sub.value)
                  ? 'bg-amber-500 text-gray-900'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <img src={sub.icon} alt="" className="h-6 w-6 object-contain" />
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Toggle for the resource/component filter rows */}
      <button
        onClick={toggleExpanded}
        className="flex items-center gap-2 self-start text-[10px] uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors py-0.5"
      >
        <span className={`text-[10px] leading-none transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span>Resource &amp; Component Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-amber-500 text-gray-900 rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold leading-none">
            {activeFilterCount}
          </span>
        )}
      </button>

      {expanded && (
        <>
      {/* Row 4: resource filters */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-0.5">Resources:</span>
        {RESOURCE_DEFS.map(res => {
          const state = resourceFilters[res.key];
          return (
            <button
              key={res.key}
              onClick={() => onResourceFilterCycle(res.key)}
              title={`${res.label} — click to require, again to exclude, again to clear`}
              className={`relative flex flex-col items-center gap-0.5 p-1 rounded text-[9px] font-medium transition-all ${
                state === 'require'
                  ? 'ring-2 ring-green-500 bg-green-950/40 text-green-400'
                  : state === 'exclude'
                  ? 'ring-2 ring-red-600 bg-red-950/40 text-red-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <div className="relative">
                <img
                  src={res.icon}
                  alt={res.label}
                  className={`h-7 w-7 object-contain transition-opacity ${
                    state ? 'opacity-100' : 'opacity-40'
                  }`}
                />
                {state === 'require' && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] leading-none font-bold">✓</span>
                )}
                {state === 'exclude' && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] leading-none font-bold">✕</span>
                )}
              </div>
              <span>{res.label}</span>
            </button>
          );
        })}
        {hasActiveResourceFilters && (
          <button
            onClick={onResourceFiltersReset}
            className="ml-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 border border-amber-800/50 rounded hover:border-amber-600"
          >
            Reset
          </button>
        )}
      </div>

      {/* Row 5: component filters */}
      {allComponentNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-0.5">Components:</span>
          {allComponentNames.map(name => {
            const state = componentFilters[name];
            return (
              <button
                key={name}
                onClick={() => onComponentFilterCycle(name)}
                title={`${name} — click to require, again to exclude, again to clear`}
                className={`relative flex flex-col items-center gap-0.5 p-1 rounded text-[9px] font-medium transition-all ${
                  state === 'require'
                    ? 'ring-2 ring-green-500 bg-green-950/40 text-green-400'
                    : state === 'exclude'
                    ? 'ring-2 ring-red-600 bg-red-950/40 text-red-400'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="relative">
                  <img
                    src={STANDARD_COMPONENT_ICONS[name]}
                    alt={name}
                    className={`h-7 w-7 object-contain transition-opacity ${state ? 'opacity-100' : 'opacity-40'}`}
                  />
                  {state === 'require' && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] leading-none font-bold">✓</span>
                  )}
                  {state === 'exclude' && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] leading-none font-bold">✕</span>
                  )}
                </div>
                <span>{name}</span>
              </button>
            );
          })}
          {hasActiveComponentFilters && (
            <button
              onClick={onComponentFiltersReset}
              className="ml-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 border border-amber-800/50 rounded hover:border-amber-600"
            >
              Reset
            </button>
          )}
        </div>
      )}
        </>
      )}

    </div>
  );
}
