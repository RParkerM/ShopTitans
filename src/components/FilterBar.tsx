import { MAIN_CATEGORIES, SUBCATEGORIES, type MainCategory } from '../utils/categories';
import { RESOURCE_DEFS } from '../utils/resources';
import { STANDARD_COMPONENT_ICONS } from '../utils/components';
import type { SortOrder, MasteredFilter } from '../App';
import type { ResourceFilters, ResourceKey, ComponentFilters } from '../types';

interface FilterBarProps {
  selectedCategory: MainCategory;
  onCategoryChange: (category: MainCategory) => void;
  selectedSubType: string;
  onSubTypeChange: (subType: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  showOwnedOnly: boolean;
  onShowOwnedOnlyChange: (v: boolean) => void;
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
  selectedSubType,
  onSubTypeChange,
  search,
  onSearchChange,
  showOwnedOnly,
  onShowOwnedOnlyChange,
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
  const hasActiveResourceFilters = Object.keys(resourceFilters).length > 0;
  const hasActiveComponentFilters = Object.keys(componentFilters).length > 0;

  return (
    <div className="sticky top-[57px] z-10 bg-gray-900 border-b border-gray-700 px-4 py-3 flex flex-col gap-2">

      {/* Row 1: search + owned only + sort */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search blueprints…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 w-48"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={showOwnedOnly}
            onChange={e => onShowOwnedOnlyChange(e.target.checked)}
            className="accent-amber-500"
          />
          Owned only
        </label>
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
              onClick={() => onSubTypeChange(selectedSubType === sub.value ? '' : sub.value)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-colors leading-tight ${
                selectedSubType === sub.value
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

    </div>
  );
}
