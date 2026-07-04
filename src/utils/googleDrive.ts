// Google Identity Services (GIS) auth + Google Drive appDataFolder helpers.
//
// Save data is stored as one JSON file per profile inside the app's hidden
// appDataFolder — invisible in the user's normal Drive, readable only by this
// app. OAuth uses the GIS token flow (short-lived access tokens, silently
// re-requested), so there is no backend and no long-lived secret.

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export function isConfigured(): boolean {
  return !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
}

// ── GIS loading + token management ─────────────────────────────────────────

let gisLoaded: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google sign-in'));
    document.head.appendChild(s);
  });
  return gisLoaded;
}

let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiry = 0;

// Cache the access token so reloads within its ~1h lifetime don't need a
// fresh (and on some browsers interactive) sign-in. Scope is limited to
// drive.appdata and the token is short-lived, so localStorage is acceptable.
const TOKEN_CACHE_KEY = 'st_drive_token';

function persistToken(token: string, expiry: number): void {
  accessToken = token;
  tokenExpiry = expiry;
  try {
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify({ token, expiry }));
  } catch { /* ignore */ }
}

// Rehydrate a still-valid token from a previous page load.
(function rehydrateToken() {
  try {
    const raw = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!raw) return;
    const { token, expiry } = JSON.parse(raw) as { token: string; expiry: number };
    if (token && Date.now() < expiry) {
      accessToken = token;
      tokenExpiry = expiry;
    }
  } catch { /* ignore */ }
})();

async function ensureTokenClient(): Promise<void> {
  await loadGis();
  if (tokenClient) return;
  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: SCOPE,
    callback: () => {}, // replaced per request
  });
}

/**
 * Request an access token. `interactive` shows the Google consent/account
 * popup; non-interactive attempts a silent grant (works if already consented).
 */
export async function requestToken(interactive: boolean): Promise<string> {
  await ensureTokenClient();
  return new Promise<string>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(new Error(resp.error));
        return;
      }
      // Refresh a minute early to avoid using an about-to-expire token.
      persistToken(resp.access_token, Date.now() + ((resp.expires_in ?? 3600) - 60) * 1000);
      resolve(accessToken as string);
    };
    tokenClient.error_callback = (err: any) => reject(new Error(err?.type ?? 'auth_failed'));
    try {
      tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
    } catch (e) {
      reject(e as Error);
    }
  });
}

async function getToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  return requestToken(false);
}

export function hasToken(): boolean {
  return !!accessToken && Date.now() < tokenExpiry;
}

export function clearToken(): void {
  accessToken = null;
  tokenExpiry = 0;
  try {
    localStorage.removeItem(TOKEN_CACHE_KEY);
  } catch { /* ignore */ }
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  let res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    // Token expired/revoked — get a fresh one silently and retry once.
    clearToken();
    const fresh = await requestToken(false);
    headers.set('Authorization', `Bearer ${fresh}`);
    res = await fetch(url, { ...init, headers });
  }
  return res;
}

// ── Drive operations (appDataFolder) ───────────────────────────────────────

export interface RemoteProfile {
  fileId: string;
  id: string;
  name: string;
  updatedAt: number;
}

export async function listProfiles(): Promise<RemoteProfile[]> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,appProperties)',
    pageSize: '100',
  });
  const res = await authedFetch(`${FILES_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
  const json = await res.json();
  const out: RemoteProfile[] = [];
  for (const f of json.files ?? []) {
    const ap = f.appProperties ?? {};
    if (!ap.stprofile) continue; // ignore anything not ours
    out.push({
      fileId: f.id,
      id: ap.stprofile,
      name: ap.name ?? 'Profile',
      updatedAt: Number(ap.updatedAt) || 0,
    });
  }
  return out;
}

export async function readProfile(fileId: string): Promise<{ data: unknown }> {
  const res = await authedFetch(`${FILES_URL}/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`Drive read failed (${res.status})`);
  return res.json();
}

export async function writeProfile(params: {
  fileId?: string;
  id: string;
  name: string;
  updatedAt: number;
  data: unknown;
}): Promise<string> {
  const { fileId, id, name, updatedAt, data } = params;
  const metadata: Record<string, unknown> = {
    name: `st-profile-${id}.json`,
    mimeType: 'application/json',
    appProperties: { stprofile: id, name, updatedAt: String(updatedAt) },
  };
  if (!fileId) metadata.parents = ['appDataFolder'];

  const content = JSON.stringify({ v: 1, id, name, updatedAt, data });
  const boundary = 'stb' + Math.random().toString(36).slice(2);
  // Drive's multipart upload requires multipart/related, not form-data.
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`;

  const url = fileId
    ? `${UPLOAD_URL}/${fileId}?uploadType=multipart&fields=id`
    : `${UPLOAD_URL}?uploadType=multipart&fields=id`;
  const res = await authedFetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Drive write failed (${res.status})`);
  const json = await res.json();
  return json.id as string;
}

export async function deleteProfile(fileId: string): Promise<void> {
  const res = await authedFetch(`${FILES_URL}/${fileId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Drive delete failed (${res.status})`);
}
