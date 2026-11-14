import assert from 'node:assert/strict';
import test from 'node:test';
import { displayNameFromEmail, readAuthCallback } from './auth-callback.ts';

const native = 'tonthun://auth/callback';
const web = 'https://tonthun.example/auth/callback';

test('only accepts the configured callback origin and path', () => {
  for (const url of ['evil://auth/callback?code=x', 'tonthun://other/callback?code=x', 'tonthun://auth/other?code=x', 'https://evil.example/auth/callback?code=x', 'https://tonthun.example:444/auth/callback?code=x']) {
    assert.equal(readAuthCallback(url, url.startsWith('https:') ? web : native), null);
  }
});

test('reads PKCE codes on native, Expo Go, and web callback URLs', () => {
  for (const base of [native, web, 'exp://192.168.1.2:8081/--/auth/callback']) {
    assert.equal(readAuthCallback(`${base}?code=one-time-code`, base)?.code, 'one-time-code');
  }
});

test('handles legacy fragment sessions, recovery type, and expired-link errors', () => {
  const result = readAuthCallback(`${native}#access_token=a&refresh_token=r&type=recovery`, native);
  assert.equal(result?.accessToken, 'a');
  assert.equal(result?.refreshToken, 'r');
  assert.equal(result?.type, 'recovery');
  assert.equal(readAuthCallback(`${web}?error=access_denied#error_description=Link+expired`, web)?.error, 'Link expired');
  assert.equal(readAuthCallback(web, web)?.code, null);
});

test('derives the display name from the trimmed email without inventing a real name', () => {
  assert.equal(displayNameFromEmail(' ice.design@example.com '), 'ice.design');
  assert.equal(displayNameFromEmail('ice+stocks@example.com'), 'ice+stocks');
});
