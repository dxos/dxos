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

// A Cursor makes a pipeline idempotent: it is the durable position a run resumes from. A pure dedup
// stage drops anything at or below the cursor's high-water key, and the commit advances the cursor as
// it writes. These tests demonstrate that with a generic pipeline over a plain-array sink — nothing
// here is sync-specific.
describe('Cursor idempotency', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  /**
   * A fresh harness: a `cursor`, the `committed` sink (all ids written so far), and a `run` that
   * streams the source through a dedup-by-cursor stage into a commit that advances the cursor. Each
   * `run` resumes from the cursor, exactly as a real pipeline would.
   */
  const setup = async () => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor] });
    const cursor = db.add(Cursor.make());
    const committed: string[] = [];

    const run = ({ available, failAfter }: RunOptions) => {
      const highWater = Cursor.parseKey(cursor.value);
      const source = Stream.fromIterable(ITEMS.slice(0, available)).pipe(
        Stage.filter('dedup', (item: Item) => item.key > highWater),
      );
      return (failAfter === undefined ? source : source.pipe(failAt(failAfter))).pipe(
        // One item per page, so each commit + cursor advance lands independently.
        Stream.grouped(1),
        Pipeline.run({
          sink: Cursor.commit({
            cursor,
            write: (items) => Effect.sync(() => committed.push(...items.map((item) => item.id))),
            keyOf: (item) => item.key,
          }),
        }),
      );
    };

    return { cursor, committed, run };
  };

  test('commits every item and advances the cursor to the high-water key', async ({ expect }) => {
    const { cursor, committed, run } = await setup();

    await EffectEx.runPromise(run({ available: 4 }));

    expect(committed).toEqual(['a', 'b', 'c', 'd']);
    expect(cursor.value).toBe('40');
  });

  test('skips items already at or below the cursor on a later run', async ({ expect }) => {
    const { cursor, committed, run } = await setup();

    await EffectEx.runPromise(run({ available: 2 }));
    expect(cursor.value).toBe('20');

    // The source now offers all four; only the two past the cursor are committed.
    await EffectEx.runPromise(run({ available: 4 }));

    expect(committed).toEqual(['a', 'b', 'c', 'd']);
    expect(cursor.value).toBe('40');
  });

  test('a mid-run failure commits only the completed pages and leaves the cursor there', async ({ expect }) => {
    const { cursor, committed, run } = await setup();

    const exit = await EffectEx.runPromise(Effect.exit(run({ available: 4, failAfter: 3 })));

    expect(Exit.isFailure(exit)).toBe(true);
    expect(committed).toEqual(['a', 'b', 'c']);
    expect(cursor.value).toBe('30');
  });

  test('recovers from a failure without reprocessing committed items', async ({ expect }) => {
    const { cursor, committed, run } = await setup();

    await EffectEx.runPromise(Effect.exit(run({ available: 4, failAfter: 3 })));
    expect(committed).toEqual(['a', 'b', 'c']);

    // The recovery run resumes from the cursor: only the uncommitted tail is written.
    await EffectEx.runPromise(run({ available: 4 }));

    expect(committed).toEqual(['a', 'b', 'c', 'd']);
    expect(cursor.value).toBe('40');
  });
});

/** Calendar-day arithmetic mirroring {@link Cursor.resolveWindow}'s internal helper. */
const addCalendarDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

describe('resolveWindow', () => {
  const NOW = new Date('2026-07-06T00:00:00.000Z');

  test('no cursor → backward initial from the default horizon to today', ({ expect }) => {
    const window = Cursor.resolveWindow({ cursorKey: 0, now: NOW });
    expect(window.direction).toBe('backward');
    expect(window.start).toEqual(addCalendarDays(NOW, -30));
    expect(window.end).toEqual(addCalendarDays(NOW, 1));
  });

  test('cursor → forward incremental from the cursor', ({ expect }) => {
    const cursorKey = new Date('2026-06-01T00:00:00.000Z').getTime();
    const window = Cursor.resolveWindow({ cursorKey, now: NOW });
    expect(window.direction).toBe('forward');
    expect(window.start).toEqual(new Date(cursorKey));
    expect(window.end).toEqual(addCalendarDays(NOW, 1));
  });

  test('direction: backward + before → backfill older gaps, ignoring the cursor as the start', ({ expect }) => {
    const cursorKey = new Date('2026-06-01T00:00:00.000Z').getTime();
    const before = new Date('2026-05-01T00:00:00.000Z').getTime();
    const window = Cursor.resolveWindow({ cursorKey, now: NOW, direction: 'backward', before });
    expect(window.direction).toBe('backward');
    // Backward never resumes from the cursor; it walks from the horizon up to `before`.
    expect(window.start).toEqual(addCalendarDays(NOW, -30));
    expect(window.end).toEqual(new Date(before));
  });

  test('syncBackDays overrides the horizon', ({ expect }) => {
    const window = Cursor.resolveWindow({ cursorKey: 0, now: NOW, syncBackDays: 7 });
    expect(window.start).toEqual(addCalendarDays(NOW, -7));
  });

  test('after sets the horizon when syncBackDays is absent', ({ expect }) => {
    const after = '2026-01-01T00:00:00.000Z';
    const window = Cursor.resolveWindow({ cursorKey: 0, now: NOW, after });
    expect(window.start).toEqual(new Date(after));
  });
});

// One source item: an id and a monotonic key (e.g. an updated-at time / offset).
type Item = { readonly id: string; readonly key: number };
const ITEMS: readonly Item[] = [
  { id: 'a', key: 10 },
  { id: 'b', key: 20 },
  { id: 'c', key: 30 },
  { id: 'd', key: 40 },
];

type RunOptions = {
  /** How many of {@link ITEMS} the source offers this run (simulates the source growing over time). */
  readonly available: number;
  /** Crash the run after this many items reach the commit sink. */
  readonly failAfter?: number;
};

/** Fails the stream once more than `n` items have passed through, simulating a crash mid-run. */
const failAt = (n: number): Stage.Stage<Item, Item, Error> => {
  let count = 0;
  return Stage.map('fault', (item: Item) =>
    ++count > n ? Effect.fail(new Error('injected fault')) : Effect.succeed(item),
  );
};
