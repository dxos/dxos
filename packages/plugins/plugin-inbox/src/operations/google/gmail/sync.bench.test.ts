//
// Copyright 2026 DXOS.org
//

import { format, subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';

import { generateGmailDataset } from '../../../testing/gmail-fixtures';
import { OtelHarness } from '../../../testing/otel-harness';
import { inboxSyncTestServices, seedMailboxBinding } from '../../../testing/sync-fixture';

import { runGmailSync } from './sync';

// Traces and benchmarks the sync stack through the same in-memory OTEL harness. The first test always
// runs (CI): it verifies the expected spans are emitted (root, fetch, per-commit-phase) as a
// tracing-regression guard. The second is gated by `DX_BENCH` and measures per-stage / per-message
// cost across dataset sizes to surface O(n²) growth (e.g. per-message commit/append time rising with
// N). Run it:
//
//   DX_BENCH=1 moon run plugin-inbox:test -- sync.bench.test.ts
//
// Sizes overridable via DX_BENCH_SIZES=1000,5000,10000 (default 1000,4000).
//
// LOCAL-ONLY FIDELITY CAVEAT (benchmark only): this in-process `EchoTestBuilder` harness reproduces
// LOCAL costs (index growth, automerge change cost, commit) but NOT the client→worker RPC / EDGE-
// replication contention that dominated the real-app `appendToFeed` stall. Treat per-message growth
// here as a lower bound; the replication-channel contention needs the real app (or a harness with a
// replication target).
const SIZES = (process.env.DX_BENCH_SIZES ?? '1000,4000')
  .split(',')
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isFinite(value) && value > 0);

describe('runGmailSync tracing & benchmark', () => {
  let builder: EchoTestBuilder;
  const harness = new OtelHarness('inbox-sync-bench');

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
    harness.start();
  });

  afterAll(async () => {
    await harness.stop();
    await builder.close();
  });

  test('captures spans for the fetch and commit phases', { timeout: 30_000 }, async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const start = subDays(new Date(), 12);
    const dataset = generateGmailDataset({ count: 40, seed: 21, start, end });
    const after = format(subDays(new Date(), 14), 'yyyy-MM-dd');

    const { db, binding } = await seedMailboxBinding(builder);
    harness.reset();

    await EffectEx.runPromise(
      runGmailSync({ binding: Ref.make(binding), after }).pipe(
        Effect.provide(inboxSyncTestServices(db, dataset)),
        Effect.provide(harness.layer),
      ),
    );

    const names = new Set(harness.spans().map((span) => span.name));
    // Root, label sync, fetch, and every commit phase are traced.
    for (const expected of [
      'gmail-sync',
      'gmail-sync.labels',
      'gmail-sync.fetch.list',
      'gmail-sync.fetch.message',
      'sync.commit',
      'sync.commit.appendToFeed',
      'sync.commit.tags',
      'sync.commit.commitEffects',
      'sync.commit.advanceCursor',
    ]) {
      expect(names, `missing span: ${expected}`).toContain(expected);
    }

    const stats = harness.aggregate();
    // The aggregation is well-formed: one root span, and commit-phase spans repeat per page.
    const root = stats.find((stat) => stat.name === 'gmail-sync');
    expect(root?.count).toBe(1);
    expect(root!.totalMs).toBeGreaterThan(0);
    const append = stats.find((stat) => stat.name === 'sync.commit.appendToFeed');
    expect(append!.count).toBeGreaterThan(0);
  });

  test.skipIf(!process.env.DX_BENCH)(
    'per-stage / per-message durations across dataset sizes',
    { timeout: 600_000 },
    async ({ expect }) => {
      // A wide interior window (well within the 30-day sync horizon) so the whole dataset is reachable.
      const perMessageByStage = new Map<string, { size: number; perMessageMs: number }[]>();

      for (const size of SIZES) {
        const end = subDays(new Date(), 2);
        const start = subDays(new Date(), 27);
        const dataset = generateGmailDataset({ count: size, seed: 7, start, end });
        const after = format(subDays(new Date(), 29), 'yyyy-MM-dd');

        const { db, binding } = await seedMailboxBinding(builder);
        harness.reset();

        const startedAt = performance.now();
        const { newMessages } = await EffectEx.runPromise(
          runGmailSync({ binding: Ref.make(binding), after }).pipe(
            Effect.provide(inboxSyncTestServices(db, dataset)),
            Effect.provide(harness.layer),
          ),
        );
        const wallMs = performance.now() - startedAt;
        expect(newMessages).toBeGreaterThan(0);

        const stats = harness.aggregate();
        // The date-walk covers a subset of days, so `newMessages` (actual) is the honest denominator.
        const table = stats.map((stat) => ({
          stage: stat.name,
          count: stat.count,
          totalMs: round(stat.totalMs),
          meanMs: round(stat.meanMs),
          maxMs: round(stat.maxMs),
          perMessageMs: round(stat.totalMs / newMessages),
        }));

        // eslint-disable-next-line no-console
        console.log(`\n=== dataset size ${size} → ${newMessages} synced (wall ${round(wallMs)}ms) ===`);
        // eslint-disable-next-line no-console
        console.table(table);

        for (const stat of stats) {
          const series = perMessageByStage.get(stat.name) ?? [];
          series.push({ size, perMessageMs: stat.totalMs / newMessages });
          perMessageByStage.set(stat.name, series);
        }
      }

      // Growth summary: per-message time for each stage as N grows. A flat column ≈ linear scaling; a
      // rising column is the O(n²) signal to chase down.
      if (SIZES.length > 1) {
        const growth = [...perMessageByStage.entries()].map(([stage, series]) => {
          const row: Record<string, number | string> = { stage };
          for (const point of series) {
            row[`n=${point.size}`] = round(point.perMessageMs);
          }
          return row;
        });
        // eslint-disable-next-line no-console
        console.log('\n=== per-message ms by stage (growth across N) ===');
        // eslint-disable-next-line no-console
        console.table(growth);
      }

      expect(perMessageByStage.has('gmail-sync')).toBe(true);
    },
  );
});

const round = (value: number): number => Math.round(value * 100) / 100;
