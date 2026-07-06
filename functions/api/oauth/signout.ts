import { type Ctx, REFRESH_COOKIE, REVOKE_URL, badOrigin, clearCookie, getCookie, json } from './_shared';

// Signs the user out: best-effort revokes the Google grant, then clears the
// refresh cookie either way.
export const onRequestPost = async ({ request }: Ctx): Promise<Response> => {
  if (badOrigin(request)) return json({ error: 'forbidden' }, 403);

  const refreshToken = getCookie(request, REFRESH_COOKIE);
  if (refreshToken) {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' })
      .catch(() => { /* revocation is best-effort */ });
  }
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': clearCookie(REFRESH_COOKIE) },
  });
};
