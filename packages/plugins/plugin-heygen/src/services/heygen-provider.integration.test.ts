//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeHeyGenProvider } from './heygen-service';

//
// Live integration test against the real HeyGen API. Skipped unless HEYGEN_API_KEY is set, so it
// never runs in CI (no secret) but can be exercised on demand:
//
//   HEYGEN_API_KEY=<key> moon run plugin-heygen:test -- heygen-provider.integration.test.ts
//
// It uses `makeHeyGenProvider` — the same proxy-wired provider the app uses — so it covers the full
// path (edge CORS proxy → HeyGen → response parsing → auth), which the mock-fetch unit tests cannot.
// See `heygen-provider.test.ts` for the fast, offline contract tests. This is the DXOS pattern for
// testing a remote API: gate the network suite on the credential env var with `describe.skipIf`.
//

const apiKey = process.env.HEYGEN_API_KEY;

describe.skipIf(!apiKey)('HeyGenProvider (live)', () => {
  test('listAvatars returns well-formed options', async ({ expect }) => {
    if (!apiKey) {
      return; // Unreachable when the suite runs; narrows `apiKey` to string without a cast.
    }

    const options = await makeHeyGenProvider().listAvatars({ apiKey });
    expect(Array.isArray(options)).toBe(true);
    for (const option of options) {
      expect(typeof option.id).toBe('string');
      expect(typeof option.name).toBe('string');
    }
  });

  test('listVoices returns well-formed options', async ({ expect }) => {
    if (!apiKey) {
      return;
    }

    const options = await makeHeyGenProvider().listVoices({ apiKey });
    expect(Array.isArray(options)).toBe(true);
    for (const option of options) {
      expect(typeof option.id).toBe('string');
      expect(typeof option.name).toBe('string');
    }
  });
});
