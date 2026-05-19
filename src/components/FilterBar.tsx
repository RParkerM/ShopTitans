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
  return (
    <div className="sticky top-[57px] z-10 bg-gray-850 border-b border-gray-700 px-4 py-3 flex flex-wrap gap-3 items-center bg-gray-900">
      <input
        type="text"
        placeholder="Search blueprints…"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 w-48"
      />

      <div className="flex flex-wrap gap-1.5">
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

      <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer ml-auto select-none">
        <input
          type="checkbox"
          checked={showOwnedOnly}
          onChange={e => onShowOwnedOnlyChange(e.target.checked)}
          className="accent-amber-500"
        />
        Owned only
      </label>
    </div>
  );
}
