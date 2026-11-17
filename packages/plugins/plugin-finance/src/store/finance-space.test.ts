//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, test } from 'vitest';

import { Database } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { Finance } from '#types';

import * as FinanceSpace from './finance-space.ts';

const observation = (id: string, close: number) =>
  Finance.makeObservation({
    key: { source: 'example.com', id },
    kind: 'price',
    symbol: 'AAPL',
    date: '2026-11-13',
    values: { close },
  });

/** Opens the space under `dataRoot`, appends the observations, and returns how many were new and how many the feed holds. */
const ingest = (dataRoot: string, candidates: Finance.Observation[]) =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const { db } = yield* FinanceSpace.open(dataRoot);
      return yield* Effect.gen(function* () {
        const feed = yield* FinanceSpace.feedFor('example.com');
        const added = yield* FinanceSpace.appendNew(feed, Finance.Observation, candidates);
        const stored = yield* FinanceSpace.items(feed, Finance.Observation);
        return { added, stored: stored.map((item) => item.values.close).sort() };
      }).pipe(Effect.provide(Database.layer(db)));
    }).pipe(Effect.scoped),
  );

describe('FinanceSpace', () => {
  let dataRoot: string | undefined;
  afterEach(() => {
    if (dataRoot) {
      rmSync(dataRoot, { recursive: true, force: true });
    }
  });

  test('persists feed items across reopen and dedupes on the foreign key', { timeout: 60_000 }, async ({ expect }) => {
    dataRoot = mkdtempSync(join(tmpdir(), 'finance-space-'));
    expect(await ingest(dataRoot, [observation('a', 1), observation('b', 2), observation('a', 9)])).toEqual({
      added: 2,
      stored: [1, 2],
    });
    expect(await ingest(dataRoot, [observation('b', 2), observation('c', 3)])).toEqual({ added: 1, stored: [1, 2, 3] });
  });
});
