// Shared helpers for the Google OAuth Pages Functions.
//
// These functions are the only place the OAuth client secret exists, and the
// refresh token is kept in an HttpOnly cookie scoped to /api/oauth — browser
// JS never sees either. The client only ever holds short-lived access tokens
// obtained from /api/oauth/refresh.
//
// Files prefixed with "_" are not routed by Cloudflare Pages.

export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export interface Ctx {
  request: Request;
  env: Env;
}

export const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export const REFRESH_COOKIE = 'st_drive_rt';
export const STATE_COOKIE = 'st_oauth_state';
const COOKIE_PATH = '/api/oauth';

// 400 days — the maximum cookie lifetime Chrome allows. The cookie is
// re-set on every refresh-token rotation, so it effectively never expires
// while the user keeps using the app.
export const REFRESH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

// SameSite note: the state cookie must be Lax so the browser sends it on the
// top-level navigation back from accounts.google.com; the refresh cookie is
// only read by same-origin fetches, so it can be Strict.
export function cookie(
  name: string,
  value: string,
  maxAge: number,
  sameSite: 'Lax' | 'Strict',
): string {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=${sameSite}`;
}

export function clearCookie(name: string): string {
  return cookie(name, '', 0, 'Lax');
}

export function redirectUri(request: Request): string {
  return `${new URL(request.url).origin}${COOKIE_PATH}/callback`;
}

export interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
}

/** POST to Google's token endpoint; parses the JSON body even on error. */
export async function tokenRequest(
  env: Env,
  params: Record<string, string>,
): Promise<{ ok: boolean; body: TokenResponse }> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      ...params,
    }),
  });
  return { ok: res.ok, body: (await res.json()) as TokenResponse };
}

export function json(body: unknown, status: number, setCookie?: string): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (setCookie) headers.set('Set-Cookie', setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}

/** Belt-and-braces CSRF check for the JSON endpoints (cookies are SameSite too). */
export function badOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !!origin && origin !== new URL(request.url).origin;
}
