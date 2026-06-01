import { MAIN_CATEGORIES, SUBCATEGORIES, type MainCategory } from '../utils/categories';
import type { SortOrder } from '../App';

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
}: FilterBarProps) {
  const subcats = selectedCategory !== 'All' ? SUBCATEGORIES[selectedCategory] : [];

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
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value as SortOrder)}
          className="ml-auto px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
          <option value="tier-desc">Tier ↓</option>
          <option value="tier-asc">Tier ↑</option>
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

    </div>
  );
}
