import { useState } from 'react';

interface FilterBarProps {
  types: string[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  showOwnedOnly: boolean;
  onShowOwnedOnlyChange: (v: boolean) => void;
}

export function FilterBar({
  types,
  selectedType,
  onTypeChange,
  search,
  onSearchChange,
  showOwnedOnly,
  onShowOwnedOnlyChange,
}: FilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="sticky top-[57px] z-10 bg-gray-900 border-b border-gray-700 px-4 py-3 flex flex-col gap-2">

      {/* Row 1: search, owned only, mobile toggle */}
      <div className="flex items-center gap-2">
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
        </div>

        {/* Mobile toggle — hidden on md+ */}
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className={`md:hidden ml-auto px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            selectedType
              ? 'bg-amber-500 text-gray-900'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {selectedType || 'Type'} {filtersOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* Row 2: type buttons — collapsible on mobile, always shown on md+ */}
      <div className={filtersOpen ? 'flex flex-wrap gap-1.5' : 'hidden md:flex md:flex-wrap md:gap-1.5'}>
        <button
          onClick={() => onTypeChange('')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            selectedType === '' ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {types.map(type => (
          <button
            key={type}
            onClick={() => onTypeChange(type === selectedType ? '' : type)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              selectedType === type ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

    </div>
  );
}
