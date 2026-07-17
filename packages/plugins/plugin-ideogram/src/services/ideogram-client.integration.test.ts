//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';
import { describe, test } from 'vitest';

import { generateWithIdeogram } from './ideogram-client';

//
// Live integration test against the real Ideogram API. Skipped unless IDEOGRAM_API_KEY is set, so it
// never runs in CI (no secret) but can be exercised on demand:
//
//   IDEOGRAM_API_KEY=<key> moon run plugin-ideogram:test -- ideogram-client.integration.test.ts
//
// `generateWithIdeogram` routes through the edge CORS proxy (the same path the app uses), so this
// covers proxy → Ideogram → response mapping → auth, which the mock-based unit tests cannot. See
// `ideogram-mapping.test.ts` for the fast, offline mapping tests. This is the DXOS pattern for
// testing a remote API: gate the network suite on the credential env var with `describe.skipIf`.
//
// NOTE: `/generate` produces a real image and consumes Ideogram credits on every run — kept to a
// single minimal request for that reason.
//

const apiKey = process.env.IDEOGRAM_API_KEY;

describe.skipIf(!apiKey)('generateWithIdeogram (live)', () => {
  test('generates an image and maps it to a variant with a url', async ({ expect }) => {
    if (!apiKey) {
      return; // Unreachable when the suite runs; narrows `apiKey` to string without a cast.
    }

    const result = await generateWithIdeogram(
      { prompt: 'a single red circle on a plain white background', count: 1 },
      Redacted.make(apiKey),
    );
    expect(result.variants.length).toBeGreaterThan(0);
    expect(typeof result.variants[0].url).toBe('string');
    // Live image generation routinely exceeds the 5s Vitest default.
  }, 60_000);
});
