//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Stream from 'effect/Stream';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';

import * as Cursor from './Cursor';

// A minimal end-to-end demonstration that a Cursor makes a pipeline idempotent. The cursor is the
// single durable position a run resumes from: a pure dedup stage drops anything at or below the
// cursor's high-water key, and the commit sink advances the cursor as it writes. We exercise
// (1) a clean success, (2) a run that commits some pages then crashes mid-stream, and (3) a recovery
// run that re-processes the same source without re-committing anything already past the cursor.
//
// Nothing here is sync-specific — the "sink" is a plain array; the cursor alone provides idempotency.
describe('Cursor idempotency', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  // One source item: an id and a monotonic key (e.g. an updated-at time / offset).
  type Item = { readonly id: string; readonly key: number };
  const ITEMS: readonly Item[] = [
    { id: 'a', key: 10 },
    { id: 'b', key: 20 },
    { id: 'c', key: 30 },
    { id: 'd', key: 40 },
  ];

  test('success → mid-run failure → recovery, without reprocessing', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor] });
    const cursor = db.add(Cursor.make());
    // The sink: everything the pipeline has durably committed. A re-run must never append a duplicate.
    const committed: string[] = [];

    // Runs the pipeline once, resuming from the cursor. `limit` simulates how much of the source is
    // available this run; `fault` optionally crashes the stream after N items reach the commit sink.
    const run = (options: { limit: number; fault?: Stage.Stage<Item, Item, Error> }) => {
      const highWater = Cursor.parseKey(cursor.value);
      const source = Stream.fromIterable(ITEMS.slice(0, options.limit)).pipe(
        // Idempotency gate: drop anything already reflected by the cursor.
        Stage.filter('dedup', (item: Item) => item.key > highWater),
      );
      return (options.fault ? source.pipe(options.fault) : source).pipe(
        // One item per page so each commit + cursor advance lands independently.
        Stream.grouped(1),
        Pipeline.run({
          sink: (page) =>
            Effect.sync(() => {
              const items = [...page];
              if (items.length === 0) {
                return;
              }
              // The commit: write the page, then advance the cursor to its high-water key. In a real
              // store these would be one transaction; the cursor advance is what makes the re-run safe.
              for (const item of items) {
                committed.push(item.id);
              }
              Cursor.advance(cursor, Cursor.formatKey(Math.max(...items.map((item) => item.key))));
            }),
        }),
      );
    };

    // 1. Success: the first two items arrive and commit; the cursor advances to the highest key.
    await EffectEx.runPromise(run({ limit: 2 }));
    expect(committed).toEqual(['a', 'b']);
    expect(cursor.value).toBe('20');

    // 2. Failure: two more items are available. Dedup skips a/b; `c` commits (cursor → 30), then the
    //    run crashes before `d`. The cursor reflects only what actually landed.
    const exit = await EffectEx.runPromise(Effect.exit(run({ limit: 4, fault: faultAfter(1) })));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(committed).toEqual(['a', 'b', 'c']);
    expect(cursor.value).toBe('30');

    // 3. Recovery: re-run the same source. Dedup drops a/b/c (at or below the cursor); only `d` is
    //    new. No duplicates, and the cursor completes at the highest key.
    await EffectEx.runPromise(run({ limit: 4 }));
    expect(committed).toEqual(['a', 'b', 'c', 'd']);
    expect(cursor.value).toBe('40');
  });

  // Fails the stream after `n` items pass through, simulating a crash mid-run.
  const faultAfter = (n: number): Stage.Stage<Item, Item, Error> => {
    let count = 0;
    return Stage.map('fault', (item: Item) => {
      count += 1;
      return count > n ? Effect.fail(new Error('injected fault')) : Effect.succeed(item);
    });
  };
});
