import type { UserDataStore } from '../hooks/useUserData';

function fmt(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function ConflictModal({ store }: { store: UserDataStore }) {
  const { conflicts, resolveConflict, dismissConflicts } = store;
  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 flex flex-col max-h-[90vh]">
        <div className="px-5 pt-5 pb-3 border-b border-gray-700">
          <h2 className="text-white font-bold text-base">Sync conflict</h2>
          <p className="text-xs text-gray-400 mt-1">
            {conflicts.length === 1 ? 'A profile has' : `${conflicts.length} profiles have`} changes on
            both this device and the cloud since the last sync. Choose which version to keep — the other
            is overwritten.
          </p>
        </div>

        <div className="overflow-y-auto p-4 flex flex-col gap-3">
          {conflicts.map(c => {
            const cloudNewer = c.remoteUpdatedAt > c.localUpdatedAt;
            return (
              <div key={c.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col gap-2.5">
                <div className="font-semibold text-sm text-white">{c.name}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="text-gray-400">
                    This device{!cloudNewer && <span className="text-amber-400"> · newer</span>}
                    <div className="text-gray-500">{fmt(c.localUpdatedAt)}</div>
                  </div>
                  <div className="text-gray-400">
                    Cloud{cloudNewer && <span className="text-amber-400"> · newer</span>}
                    <div className="text-gray-500">{fmt(c.remoteUpdatedAt)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveConflict(c.id, 'cloud')}
                    title="Load the cloud version, replacing this device's data for this profile"
                    className="flex-1 px-2 py-1.5 rounded text-xs bg-amber-500 text-gray-900 font-medium hover:brightness-110 transition"
                  >
                    Use cloud
                  </button>
                  <button
                    onClick={() => resolveConflict(c.id, 'local')}
                    title="Keep this device's data and upload it, replacing the cloud version"
                    className="flex-1 px-2 py-1.5 rounded text-xs border border-gray-600 text-gray-200 hover:bg-gray-700 transition"
                  >
                    Keep this device
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-gray-700 flex justify-end">
          <button
            onClick={dismissConflicts}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            title="Leave both unchanged for now; you'll be asked again on the next sync"
          >
            Decide later
          </button>
        </div>
      </div>
    </div>
  );
}
