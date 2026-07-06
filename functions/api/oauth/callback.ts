import {
  type Ctx,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  STATE_COOKIE,
  clearCookie,
  cookie,
  getCookie,
  redirectUri,
  tokenRequest,
} from './_shared';

// Google redirects here after consent. Exchanges the one-time code for
// tokens, stores the refresh token in an HttpOnly cookie, and bounces back
// to the app with ?sync=connected|error so the UI can react.
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const url = new URL(request.url);

  const fail = (reason: string) =>
    new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}/?sync=error&reason=${encodeURIComponent(reason)}`,
        'Set-Cookie': clearCookie(STATE_COOKIE),
      },
    });

  const error = url.searchParams.get('error');
  if (error) return fail(error); // e.g. access_denied when the user cancels

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || state !== getCookie(request, STATE_COOKIE)) {
    return fail('state_mismatch');
  }

  const { ok, body } = await tokenRequest(env, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(request),
  });
  if (!ok || !body.refresh_token) return fail(body.error ?? 'no_refresh_token');

  const headers = new Headers({ Location: `${url.origin}/?sync=connected` });
  headers.append('Set-Cookie', clearCookie(STATE_COOKIE));
  headers.append(
    'Set-Cookie',
    cookie(REFRESH_COOKIE, body.refresh_token, REFRESH_COOKIE_MAX_AGE, 'Strict'),
  );
  return new Response(null, { status: 302, headers });
};
