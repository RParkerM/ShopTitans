import { useState, useCallback, useEffect, useRef } from 'react';
import type { UserData, UserBlueprintData, ProfileMeta, SyncStatus, SyncConflict } from '../types';
import * as drive from '../utils/googleDrive';

const LEGACY_KEY = 'st_user_data';
const PROFILES_KEY = 'st_profiles';
const SYNC_FLAG = 'st_sync_enabled';
const dataKey = (id: string) => `st_profile_${id}`;

const DEFAULT_DATA: UserBlueprintData = {
  owned: false, starforged: false, ascensionLevel: 0, craftCount: 0, ascensionShards: 0,
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface ProfilesState {
  activeId: string;
  profiles: ProfileMeta[];
}

function loadData(id: string): UserData {
  try {
    const raw = localStorage.getItem(dataKey(id));
    return raw ? (JSON.parse(raw) as UserData) : {};
  } catch {
    return {};
  }
}

function saveData(id: string, data: UserData): void {
  localStorage.setItem(dataKey(id), JSON.stringify(data));
}

function isEmpty(data: UserData): boolean {
  return Object.keys(data).length === 0;
}

/** Number of blueprints tracked in a profile — used to distinguish profiles. */
export function profileEntryCount(id: string): number {
  return Object.keys(loadData(id)).length;
}

/**
 * Return `desired`, or `base (2)`, `(3)`… if it collides (case-insensitive).
 * A trailing " (n)" on `desired` is treated as the counter, so a collision on
 * "Default (2)" yields "Default (3)", not "Default (2) (2)".
 */
function uniqueName(desired: string, existing: string[]): string {
  const taken = new Set(existing.map(n => n.toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;
  const base = desired.replace(/\s\(\d+\)$/, '');
  let i = 2;
  while (taken.has(`${base} (${i})`.toLowerCase())) i++;
  return `${base} (${i})`;
}

/**
 * Collapse duplicate metas for the same profile id, keeping the synced (or
 * newest) copy. Older clients racing concurrent syncs could adopt the same
 * remote profile twice, and duplicate ids then break every id-keyed lookup.
 */
function dedupeById(profiles: ProfileMeta[]): ProfileMeta[] {
  const byId = new Map<string, ProfileMeta>();
  for (const p of profiles) {
    const cur = byId.get(p.id);
    if (!cur) { byId.set(p.id, p); continue; }
    const better = (p.driveFileId ? 1 : 0) - (cur.driveFileId ? 1 : 0) || p.updatedAt - cur.updatedAt;
    if (better > 0) byId.set(p.id, p);
  }
  return byId.size === profiles.length ? profiles : [...byId.values()];
}

/** Repair "X (2) (2) (2)" → "X (2)": debris from an old self-renaming loop. */
function collapseRepeatedSuffix(name: string): string {
  let prev;
  do {
    prev = name;
    name = name.replace(/(\s\((\d+)\))(?:\s\(\2\))+$/, '$1');
  } while (name !== prev);
  return name;
}

/**
 * Give any same-named profiles distinct display names.
 *
 * Deterministic: suffixes are assigned in profile-id order, so every device
 * derives the same names from the same profile set. Cosmetic: updatedAt is
 * NOT bumped — a dedupe must never look like a user edit, or devices push
 * their (order-dependent) renames at each other and every round trip appends
 * another " (2)". Callers must collapse duplicate ids (dedupeById) first.
 */
function dedupeProfileNames(profiles: ProfileMeta[]): { profiles: ProfileMeta[]; changed: boolean } {
  const rename = new Map<string, string>();
  const seen: string[] = [];
  for (const p of [...profiles].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const name = uniqueName(collapseRepeatedSuffix(p.name), seen);
    seen.push(name);
    if (name !== p.name) rename.set(p.id, name);
  }
  if (rename.size === 0) return { profiles, changed: false };
  return {
    profiles: profiles.map(p => (rename.has(p.id) ? { ...p, name: rename.get(p.id)! } : p)),
    changed: true,
  };
}

// Load the profile registry, migrating a legacy single-save on first run.
function initProfiles(): ProfilesState {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProfilesState;
      if (parsed.profiles?.length && parsed.activeId) {
        const healed = dedupeById(parsed.profiles);
        const { profiles, changed } = dedupeProfileNames(healed);
        const state = { activeId: parsed.activeId, profiles };
        if (changed || healed !== parsed.profiles) {
          localStorage.setItem(PROFILES_KEY, JSON.stringify(state));
        }
        return state;
      }
    }
  } catch { /* fall through to migration */ }

  const id = uid();
  let legacy: UserData = {};
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) legacy = JSON.parse(raw) as UserData;
  } catch { /* ignore */ }
  saveData(id, legacy);
  const state: ProfilesState = {
    activeId: id,
    profiles: [{ id, name: 'Default', updatedAt: Date.now() }],
  };
  localStorage.setItem(PROFILES_KEY, JSON.stringify(state));
  return state;
}

export interface UserDataStore {
  // Active-profile data access (unchanged API for existing consumers).
  get: (name: string) => UserBlueprintData;
  update: (name: string, patch: Partial<UserBlueprintData>) => void;
  // Profiles
  profiles: ProfileMeta[];
  activeId: string;
  switchProfile: (id: string) => void;
  createProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  // Sync
  syncConfigured: boolean;
  signedIn: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  signIn: () => void;
  signOut: () => void;
  syncNow: () => void;
  // Conflicts (both device and cloud changed since last sync)
  conflicts: SyncConflict[];
  resolveConflict: (id: string, choice: 'local' | 'cloud') => void;
  dismissConflicts: () => void;
}

export function useUserData(): UserDataStore {
  const [initial] = useState(initProfiles);
  const [profiles, setProfiles] = useState<ProfileMeta[]>(initial.profiles);
  const [activeId, setActiveId] = useState<string>(initial.activeId);
  const [userData, setUserData] = useState<UserData>(() => loadData(initial.activeId));

  const [signedIn, setSignedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    drive.isConfigured() ? 'signedOut' : 'disabled',
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  // Refs so async sync routines never read stale state.
  const profilesRef = useRef(profiles); profilesRef.current = profiles;
  const activeIdRef = useRef(activeId); activeIdRef.current = activeId;
  const signedInRef = useRef(signedIn); signedInRef.current = signedIn;
  const conflictsRef = useRef(conflicts); conflictsRef.current = conflicts;

  const persist = useCallback((list: ProfileMeta[], active: string) => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify({ activeId: active, profiles: list }));
  }, []);

  const patchMeta = useCallback((id: string, patch: Partial<ProfileMeta>) => {
    const next = profilesRef.current.map(p => (p.id === id ? { ...p, ...patch } : p));
    profilesRef.current = next;
    setProfiles(next);
    persist(next, activeIdRef.current);
  }, [persist]);

  // ── Sync routines ─────────────────────────────────────────────────────

  // Serialize sync work: focus events, sign-in, and debounced pushes can all
  // fire together, and overlapping runs clobber each other's writes.
  const syncBusyRef = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullSync = useCallback(async () => {
    if (!signedInRef.current) return;
    if (syncBusyRef.current) return; // e.g. focus event during sign-in sync
    syncBusyRef.current = true;
    setSyncStatus('syncing');
    try {
      const remote = await drive.listProfiles();
      // Drive can hold several files for one profile id (older clients racing
      // concurrent syncs created blind duplicates). Keep the newest and delete
      // the rest so they can't be adopted as duplicate local profiles.
      const remoteById = new Map<string, drive.RemoteProfile>();
      const staleFileIds: string[] = [];
      for (const r of remote) {
        const cur = remoteById.get(r.id);
        if (!cur) {
          remoteById.set(r.id, r);
        } else if (r.updatedAt > cur.updatedAt) {
          staleFileIds.push(cur.fileId);
          remoteById.set(r.id, r);
        } else {
          staleFileIds.push(r.fileId);
        }
      }
      for (const fileId of staleFileIds) {
        await drive.deleteProfile(fileId).catch(() => { /* best effort */ });
      }
      const remoteExists = remoteById.size > 0;

      // On a fresh device the app auto-creates an empty "Default". If Drive
      // already has data, drop that throwaway rather than pushing it as a
      // duplicate empty profile — then we adopt the real profile(s) below.
      // Only the sole profile qualifies: with more than one local profile,
      // an empty unsynced one was created deliberately by the user (a focus
      // event fires this sync right after the new-profile prompt closes).
      const localProfiles = dedupeById(profilesRef.current);
      const soleLocal = localProfiles.length === 1;
      const dropped = new Set<string>();
      const list = localProfiles
        .map(p => ({ ...p }))
        .filter(p => {
          const throwaway =
            soleLocal && remoteExists && !p.lastSyncedAt && !p.driveFileId &&
            !remoteById.has(p.id) && isEmpty(loadData(p.id));
          if (throwaway) { dropped.add(p.id); return false; }
          return true;
        });
      for (const id of dropped) localStorage.removeItem(dataKey(id));

      const known = new Set(list.map(p => p.id));

      // Profiles that exist only on Drive (created on another device).
      for (const r of remoteById.values()) {
        if (known.has(r.id)) continue;
        known.add(r.id);
        const file = await drive.readProfile(r.fileId);
        saveData(r.id, (file.data as UserData) ?? {});
        list.push({ id: r.id, name: r.name, updatedAt: r.updatedAt, driveFileId: r.fileId, lastSyncedAt: r.updatedAt });
      }

      // Reconcile each local profile against Drive. Safe cases (only one side
      // changed) sync automatically; if BOTH changed since the last sync we
      // defer to the user rather than silently overwriting.
      const conflictList: SyncConflict[] = [];
      const removeIds = new Set<string>();
      for (const p of list) {
        const r = remoteById.get(p.id);
        if (!r) {
          if (remoteExists && (p.driveFileId || p.lastSyncedAt)) {
            // Previously synced but now gone from Drive → deleted on another
            // device. Remove locally instead of resurrecting it. (Guarded by
            // remoteExists so an empty listing can't wipe local data.)
            localStorage.removeItem(dataKey(p.id));
            removeIds.add(p.id);
          } else {
            const fileId = await drive.writeProfile({ id: p.id, name: p.name, updatedAt: p.updatedAt, data: loadData(p.id) });
            p.driveFileId = fileId; p.lastSyncedAt = p.updatedAt;
          }
          continue;
        }
        if (r.updatedAt === p.updatedAt) {
          p.driveFileId = r.fileId; p.lastSyncedAt = r.updatedAt;
          continue;
        }
        const base = p.lastSyncedAt ?? 0;
        const localDirty = p.updatedAt > base;
        const remoteAhead = r.updatedAt > base;
        if (localDirty && remoteAhead) {
          // Both sides diverged — ask the user which to keep.
          p.driveFileId = r.fileId;
          conflictList.push({
            id: p.id, name: r.name,
            localUpdatedAt: p.updatedAt, remoteUpdatedAt: r.updatedAt, remoteFileId: r.fileId,
          });
        } else if (remoteAhead) {
          const file = await drive.readProfile(r.fileId);
          saveData(p.id, (file.data as UserData) ?? {});
          p.name = r.name; p.updatedAt = r.updatedAt; p.driveFileId = r.fileId; p.lastSyncedAt = r.updatedAt;
        } else {
          const fileId = await drive.writeProfile({ fileId: r.fileId, id: p.id, name: p.name, updatedAt: p.updatedAt, data: loadData(p.id) });
          p.driveFileId = fileId; p.lastSyncedAt = p.updatedAt;
        }
      }

      const merged = list.filter(p => !removeIds.has(p.id));
      if (merged.length === 0) {
        const id = uid();
        saveData(id, {});
        merged.push({ id, name: 'Default', updatedAt: Date.now() });
      }
      // Adopted remote profiles can collide with local names (e.g. two
      // devices both starting with "Default").
      const { profiles: finalList } = dedupeProfileNames(merged);

      // Adopt a surviving profile if the active one was dropped or deleted.
      let active = activeIdRef.current;
      if (!finalList.some(p => p.id === active)) active = finalList[0].id;

      profilesRef.current = finalList;
      setProfiles(finalList);
      setActiveId(active);
      activeIdRef.current = active;
      setUserData(loadData(active));
      persist(finalList, active);
      setConflicts(conflictList);
      setSyncStatus('idle');
      setSyncError(null);
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      syncBusyRef.current = false;
    }
  }, [persist]);

  const pushActive = useCallback(async () => {
    if (!signedInRef.current) return;
    // Don't auto-push a profile that's awaiting a conflict decision.
    if (conflictsRef.current.some(c => c.id === activeIdRef.current)) return;
    if (syncBusyRef.current) {
      // A sync is in flight — retry once it has finished.
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => { void pushActive(); }, 1000);
      return;
    }
    const p = profilesRef.current.find(x => x.id === activeIdRef.current);
    if (!p) return;
    if (!p.driveFileId) {
      // Never synced: reconcile via fullSync, which checks Drive for an
      // existing file for this id. A blind create here is how duplicate
      // Drive files (and then duplicate profiles) were born.
      void fullSync();
      return;
    }
    syncBusyRef.current = true;
    setSyncStatus('syncing');
    try {
      const fileId = await drive.writeProfile({
        fileId: p.driveFileId, id: p.id, name: p.name, updatedAt: p.updatedAt,
        data: loadData(p.id),
      });
      patchMeta(p.id, { driveFileId: fileId, lastSyncedAt: p.updatedAt });
      setSyncStatus('idle');
      setSyncError(null);
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      syncBusyRef.current = false;
    }
  }, [patchMeta, fullSync]);

  // Debounced push after edits settle.
  const scheduleSync = useCallback(() => {
    if (!signedInRef.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { void pushActive(); }, 2500);
  }, [pushActive]);

  // ── Data access ───────────────────────────────────────────────────────

  const update = useCallback((name: string, patch: Partial<UserBlueprintData>) => {
    setUserData(prev => {
      const next = { ...prev, [name]: { ...(prev[name] ?? DEFAULT_DATA), ...patch } };
      saveData(activeIdRef.current, next);
      return next;
    });
    patchMeta(activeIdRef.current, { updatedAt: Date.now() });
    scheduleSync();
  }, [patchMeta, scheduleSync]);

  const get = useCallback((name: string): UserBlueprintData => {
    return userData[name] ?? DEFAULT_DATA;
  }, [userData]);

  // ── Profile management ────────────────────────────────────────────────

  // Note: mutators update the refs alongside state so that a sync starting
  // in the same tick (e.g. the focus event right after a prompt closes)
  // can't act on a stale snapshot.
  const switchProfile = useCallback((id: string) => {
    if (id === activeIdRef.current) return;
    activeIdRef.current = id;
    setActiveId(id);
    setUserData(loadData(id));
    persist(profilesRef.current, id);
  }, [persist]);

  const createProfile = useCallback((name: string) => {
    const id = uid();
    saveData(id, {});
    const finalName = uniqueName(name, profilesRef.current.map(p => p.name));
    const meta: ProfileMeta = { id, name: finalName, updatedAt: Date.now() };
    const next = [...profilesRef.current, meta];
    profilesRef.current = next;
    activeIdRef.current = id;
    setProfiles(next);
    setActiveId(id);
    setUserData({});
    persist(next, id);
    scheduleSync();
  }, [persist, scheduleSync]);

  const renameProfile = useCallback((id: string, name: string) => {
    const others = profilesRef.current.filter(p => p.id !== id).map(p => p.name);
    patchMeta(id, { name: uniqueName(name, others), updatedAt: Date.now() });
    scheduleSync();
  }, [patchMeta, scheduleSync]);

  const deleteProfile = useCallback((id: string) => {
    const current = profilesRef.current;
    if (current.length <= 1) return; // always keep one profile
    const target = current.find(p => p.id === id);
    const next = current.filter(p => p.id !== id);
    const nextActive = id === activeIdRef.current ? next[0].id : activeIdRef.current;
    localStorage.removeItem(dataKey(id));
    profilesRef.current = next;
    setProfiles(next);
    if (id === activeIdRef.current) {
      activeIdRef.current = nextActive;
      setActiveId(nextActive);
      setUserData(loadData(nextActive));
    }
    persist(next, nextActive);
    if (target?.driveFileId && signedInRef.current) {
      void drive.deleteProfile(target.driveFileId).catch(() => { /* best effort */ });
    }
  }, [persist]);

  // ── Auth ──────────────────────────────────────────────────────────────

  const signIn = useCallback(() => {
    // Full-page redirect to Google; the OAuth callback returns to the app
    // with ?sync=connected|error, handled by the load effect below.
    setSyncStatus('syncing');
    drive.beginSignIn();
  }, []);

  const signOut = useCallback(() => {
    void drive.signOut(); // revokes the refresh token, best effort
    localStorage.removeItem(SYNC_FLAG);
    setSignedIn(false);
    signedInRef.current = false;
    setSyncStatus('signedOut');
  }, []);

  const syncNow = useCallback(() => { void fullSync(); }, [fullSync]);

  const resolveConflict = useCallback((id: string, choice: 'local' | 'cloud') => {
    const c = conflictsRef.current.find(x => x.id === id);
    if (!c) return;
    const p = profilesRef.current.find(x => x.id === id);
    setSyncStatus('syncing');
    void (async () => {
      syncBusyRef.current = true;
      try {
        if (choice === 'cloud') {
          const file = await drive.readProfile(c.remoteFileId);
          saveData(id, (file.data as UserData) ?? {});
          patchMeta(id, { name: c.name, updatedAt: c.remoteUpdatedAt, lastSyncedAt: c.remoteUpdatedAt, driveFileId: c.remoteFileId });
          if (id === activeIdRef.current) setUserData(loadData(id));
        } else {
          const updatedAt = p?.updatedAt ?? Date.now();
          const fileId = await drive.writeProfile({ fileId: c.remoteFileId, id, name: p?.name ?? c.name, updatedAt, data: loadData(id) });
          patchMeta(id, { driveFileId: fileId, lastSyncedAt: updatedAt });
        }
        setConflicts(prev => prev.filter(x => x.id !== id));
        setSyncStatus('idle');
        setSyncError(null);
      } catch (e) {
        setSyncStatus('error');
        setSyncError(e instanceof Error ? e.message : String(e));
      } finally {
        syncBusyRef.current = false;
      }
    })();
  }, [patchMeta]);

  const dismissConflicts = useCallback(() => setConflicts([]), []);

  // On load: consume the OAuth-callback outcome (?sync=…), then silently
  // re-auth if the user previously enabled sync on this device.
  useEffect(() => {
    if (!drive.isConfigured()) return;

    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('sync');
    if (outcome) {
      const reason = params.get('reason');
      params.delete('sync');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState(null, '',
        window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
      if (outcome === 'connected') {
        localStorage.setItem(SYNC_FLAG, '1');
      } else {
        setSyncStatus('signedOut');
        setSyncError(`Sign-in failed${reason ? ` (${reason})` : ''}`);
        return;
      }
    }

    if (localStorage.getItem(SYNC_FLAG) !== '1') return;
    let cancelled = false;
    const finishSignIn = () => {
      setSignedIn(true);
      signedInRef.current = true;
      return fullSync();
    };
    // Reuse a cached, still-valid token across reloads with no round-trip.
    if (drive.hasToken()) {
      void finishSignIn();
      return () => { cancelled = true; };
    }
    drive.refreshAccessToken()
      .then(() => { if (!cancelled) return finishSignIn(); })
      .catch(e => {
        if (cancelled) return;
        // No refresh cookie on this device (cleared, expired, or revoked):
        // drop the flag so we stop retrying on every load.
        if (e instanceof drive.NotSignedInError) localStorage.removeItem(SYNC_FLAG);
        setSyncStatus('signedOut');
      });
    return () => { cancelled = true; };
  }, [fullSync]);

  // Reconcile when returning to the tab.
  useEffect(() => {
    const onFocus = () => { if (signedInRef.current) void fullSync(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fullSync]);

  return {
    get, update,
    profiles, activeId,
    switchProfile, createProfile, renameProfile, deleteProfile,
    syncConfigured: drive.isConfigured(),
    signedIn, syncStatus, syncError,
    signIn, signOut, syncNow,
    conflicts, resolveConflict, dismissConflicts,
  };
}
