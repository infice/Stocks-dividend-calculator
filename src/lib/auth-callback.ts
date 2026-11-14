/** Keep callback parsing independent of platform and never log callback credentials. */
export function readAuthCallback(url: string, expectedUrl: string) {
  const parsed = new URL(url);
  const expected = new URL(expectedUrl);
  if (parsed.protocol !== expected.protocol || parsed.host !== expected.host
    || parsed.pathname.replace(/\/$/, '') !== expected.pathname.replace(/\/$/, '')) return null;
  const query = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  const read = (key: string) => query.get(key) ?? fragment.get(key);
  return {
    code: read('code'),
    accessToken: read('access_token'),
    refreshToken: read('refresh_token'),
    type: read('type'),
    error: read('error_description') ?? read('error'),
  };
}

export const displayNameFromEmail = (email: string) => email.trim().split('@')[0];
