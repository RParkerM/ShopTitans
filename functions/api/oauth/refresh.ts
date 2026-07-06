import {
  type Ctx,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  badOrigin,
  clearCookie,
  cookie,
  getCookie,
  json,
  tokenRequest,
} from './_shared';

// Redeems the refresh-token cookie for a fresh ~1h access token. The client
// calls this silently whenever its cached token is missing or expired, so
// the user never sees a sign-in prompt after the first consent.
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  if (badOrigin(request)) return json({ error: 'forbidden' }, 403);

  const refreshToken = getCookie(request, REFRESH_COOKIE);
  if (!refreshToken) return json({ error: 'not_signed_in' }, 401);

  const { ok, body } = await tokenRequest(env, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  if (!ok || !body.access_token) {
    // invalid_grant → revoked or expired; drop the cookie so the client
    // falls back to an interactive sign-in instead of retrying forever.
    return json({ error: body.error ?? 'refresh_failed' }, 401, clearCookie(REFRESH_COOKIE));
  }

  // Google occasionally rotates refresh tokens; keep the newest one.
  const rotated = body.refresh_token
    ? cookie(REFRESH_COOKIE, body.refresh_token, REFRESH_COOKIE_MAX_AGE, 'Strict')
    : undefined;
  return json({ access_token: body.access_token, expires_in: body.expires_in }, 200, rotated);
};
