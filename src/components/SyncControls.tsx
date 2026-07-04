import type { UserDataStore } from '../hooks/useUserData';

const NEW_PROFILE = '__new__';

const STATUS_LABEL: Record<string, string> = {
  syncing: '⟳ Syncing…',
  idle: '✓ Synced',
  error: '⚠ Retry',
};

export function SyncControls({ store }: { store: UserDataStore }) {
  const {
    profiles, activeId, switchProfile, createProfile, renameProfile, deleteProfile,
    syncConfigured, signedIn, syncStatus, syncError, signIn, signOut, syncNow,
  } = store;

  const active = profiles.find(p => p.id === activeId);

  function onSelect(value: string) {
    if (value === NEW_PROFILE) {
      const name = window.prompt('New profile name:')?.trim();
      if (name) createProfile(name);
    } else {
      switchProfile(value);
    }
  }

  function onRename() {
    const name = window.prompt('Rename profile:', active?.name)?.trim();
    if (name) renameProfile(activeId, name);
  }

  function onDelete() {
    if (profiles.length <= 1) return;
    if (window.confirm(`Delete profile "${active?.name}"? This removes its data locally${signedIn ? ' and from Drive' : ''}.`)) {
      deleteProfile(activeId);
    }
  }

  const btn = 'text-gray-500 hover:text-gray-200 transition-colors px-1.5 py-1 disabled:opacity-30 disabled:hover:text-gray-500';

  return (
    <div className="flex items-center gap-1 text-xs">
      <select
        value={activeId}
        onChange={e => onSelect(e.target.value)}
        title="Active profile"
        className="max-w-[7rem] px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-amber-500 cursor-pointer"
      >
        {profiles.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
        <option value={NEW_PROFILE}>＋ New profile…</option>
      </select>

      <button onClick={onRename} title="Rename profile" className={btn}>✎</button>
      <button onClick={onDelete} title="Delete profile" disabled={profiles.length <= 1} className={btn}>🗑</button>

      {syncConfigured && (
        signedIn ? (
          <div className="flex items-center gap-1">
            <button
              onClick={syncNow}
              title={syncError ?? 'Sync now'}
              className={`px-2 py-1 rounded border transition-colors whitespace-nowrap ${
                syncStatus === 'error'
                  ? 'border-red-800/60 text-red-400 hover:border-red-600'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              {STATUS_LABEL[syncStatus] ?? '↻ Sync'}
            </button>
            <button onClick={signOut} title="Sign out of Drive sync" className={btn}>⎋</button>
          </div>
        ) : (
          <button
            onClick={signIn}
            title="Sign in with Google to sync across devices"
            className="px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors whitespace-nowrap"
          >
            ☁ Sync
          </button>
        )
      )}
    </div>
  );
}
