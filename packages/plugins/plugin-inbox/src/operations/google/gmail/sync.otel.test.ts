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

// Verifies the sync stack is traced end-to-end: running `runGmailSync` under an in-memory OTEL
// harness captures the `Effect.withSpan` spans (root, fetch, per-commit-phase). Stage 5's benchmark
// reuses the same harness to aggregate these into a per-stage duration table.
describe('runGmailSync OTEL tracing', () => {
  let builder: EchoTestBuilder;
  const harness = new OtelHarness('inbox-sync-otel-test');

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
      'sync.commit.contacts',
      'sync.commit.sideEffects',
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
});
