//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import { fixtureExists, generateText, parseJsonObject, selectVariants } from '../testing/harness';

// Smoke + baseline for the model ladder. For each selected variant: warms the model once (a cold
// Ollama load is a 10–30s VRAM spike that would poison timing), then times a single structured call
// and checks the JSON parses. Validates that every catalog DXN RESOLVES (an unresolved model degrades
// to empty output, silently) and gives the first latency + reliability numbers per tier.
//
//   MODELS=local pnpm exec vitest run --project=node src/test/ladder-probe.test.ts

// Requires the private mailbox fixture + local Ollama models + credentials; skipped in CI (as with the
// benches) so an unresolved-model assertion doesn't red the Check where those aren't present.
describe.skipIf(!fixtureExists())('model ladder probe', () => {
  test(
    'each variant resolves, times, and parses JSON',
    async ({ expect }) => {
      const variants = selectVariants();
      const rows: Record<string, unknown>[] = [];
      for (const variant of variants) {
        const run = (prompt: string) =>
          EffectEx.runPromise(
            generateText(variant.model, variant.provider, prompt, '120 seconds').pipe(
              Effect.provide(AiServiceTestingPreset(variant.preset)),
            ),
          );

        // Warm the model (excluded from timing).
        await run('Reply with the word ok.');

        const start = performance.now();
        const raw = await run('Return ONLY a JSON object of the form {"ok": true}. No other text.');
        const latencyMs = Math.round(performance.now() - start);
        const parsed = parseJsonObject<{ ok?: unknown } | null>(raw, null);

        const row = {
          model: variant.name,
          reasoning: variant.reasoning ?? false,
          latencyMs,
          chars: raw.length,
          resolved: raw.length > 0,
          jsonOk: parsed !== null,
        };
        rows.push(row);
        log.info('probe', row);
      }
      // eslint-disable-next-line no-console
      console.table(rows);
      // Every selected model must resolve (non-empty) — an unresolved DXN is a silent failure.
      const unresolved = rows.filter((row) => !row.resolved).map((row) => row.model);
      expect(unresolved, `unresolved models: ${unresolved.join(', ')}`).toEqual([]);
    },
    30 * 60_000,
  );
});
