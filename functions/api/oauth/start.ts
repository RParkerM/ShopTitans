import { type Ctx, AUTH_URL, SCOPE, STATE_COOKIE, cookie, redirectUri } from './_shared';

// Begins sign-in: sets a CSRF state cookie and forwards to Google's consent
// screen. access_type=offline + prompt=consent guarantees the callback
// exchange returns a refresh token (Google omits it on repeat consents
// otherwise). Sign-in is a rare, explicit action, so the extra consent
// screen is an acceptable cost.
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(request),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${AUTH_URL}?${params}`,
      'Set-Cookie': cookie(STATE_COOKIE, state, 600, 'Lax'),
    },
  });
};
