//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';
import { describe, test } from 'vitest';

import { HIGGSFIELD_DEFAULT_IMAGE_MODEL } from '../constants.ts';
import { joinCredential } from './higgsfield-credential.ts';
import { makeHiggsfieldProvider, makeHiggsfieldVideoService } from './higgsfield-service.ts';

//
// Live integration test against the real Higgsfield API. Skipped unless HIGGSFIELD_API_KEY and
// HIGGSFIELD_SECRET_API_KEY are set, so it never runs in CI (no secret) but can be exercised on demand:
//
//   HIGGSFIELD_API_KEY=… HIGGSFIELD_SECRET_API_KEY=… pnpm --filter @dxos/plugin-higgsfield exec vitest run \
//     --project=node src/services/higgsfield-provider.integration.test.ts
//
// It uses `makeHiggsfieldProvider` — the same proxy-wired provider the app uses — so it covers the
// full path (edge CORS proxy → Higgsfield → response parsing → auth), which the mock-fetch unit
// tests cannot. It submits ONE Soul image generation, which spends account credits.
//

const credential = joinCredential(process.env.HIGGSFIELD_API_KEY ?? '', process.env.HIGGSFIELD_SECRET_API_KEY ?? '');

describe.skipIf(!credential)('HiggsfieldProvider (live)', () => {
  // Credit-free: an unknown request id answers 404 only once the credential has been accepted, so
  // this proves the proxy + `Authorization: Key …` path without submitting a generation.
  test('status lookup authenticates through the proxy', async ({ expect }) => {
    if (!credential) {
      return;
    }

    const provider = makeHiggsfieldProvider();
    await expect(provider.awaitResult('00000000-0000-4000-8000-000000000000', { credential })).rejects.toThrow(/404/);
  });

  test('generates one video clip: a Soul still animated by DoP lite', { timeout: 10 * 60_000 }, async ({ expect }) => {
    if (!credential) {
      return;
    }

    const service = makeHiggsfieldVideoService();
    const { enqueue, awaitResult } = service;
    expect(enqueue && awaitResult).toBeTruthy();
    if (!enqueue || !awaitResult) {
      return;
    }
    const apiKey = Redacted.make(credential);
    const { jobId } = await enqueue(
      { ...service.defaultRequest, prompt: 'A quiet alpine lake at sunrise; slow dolly in, mist drifting.' },
      { apiKey },
    );
    expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
    const { variants } = await awaitResult(jobId, { apiKey });
    expect(variants[0]?.contentType).toBe('video/mp4');
    expect(variants[0]?.url).toMatch(/^https:\/\//);
    console.log('[higgsfield live] clip', variants[0]?.url);
  });

  test('generates one image with the default model', { timeout: 5 * 60_000 }, async ({ expect }) => {
    if (!credential) {
      return; // Unreachable when the suite runs; narrows `credential` without a cast.
    }

    const provider = makeHiggsfieldProvider();
    const { jobId } = await provider.enqueue(
      {
        model: HIGGSFIELD_DEFAULT_IMAGE_MODEL,
        body: { prompt: 'A quiet alpine lake at sunrise, editorial photography' },
      },
      { credential },
    );
    expect(jobId).toMatch(/^[0-9a-f-]{36}$/);

    const output = await provider.awaitResult(jobId, { credential });
    expect(output.kind).toBe('image');
    if (output.kind === 'image') {
      expect(output.urls.length).toBeGreaterThan(0);
      expect(output.urls[0]).toMatch(/^https:\/\//);
    }
  });
});
