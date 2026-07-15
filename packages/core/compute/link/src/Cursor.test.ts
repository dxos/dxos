//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Expando } from '@dxos/schema';

import * as Cursor from './Cursor';

describe('Cursor.layer', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('runs the machinery off a feed cursor with no external/credential coupling', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'facts' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), high: 'seed' }));

    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(
        Cursor.layer({
          cursor,
          foreignKeySource: 'test',
          highKey: 0,
          stats: { newMessages: 0 },
        }),
      ),
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

    expect(state.cursor.id).toBe(cursor.id);
    expect(state.cursor.high).toBe('seed');
    expect(state.lowKey).toBe(0);
    expect(state.trackRange).toBe(false);
    expect(Cursor.isFeed(cursor)).toBe(true);
  });

  test("trackRange: false (the default) never touches low, even when a page's min key is lower", async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));

    const makeUnit = (key: number): Cursor.CommitUnit => ({
      object: Expando.make({ [Obj.Meta]: { keys: [{ id: `id-${key}`, source: 'test' }] }, key }),
      foreignId: `id-${key}`,
      key,
    });

    await EffectEx.runPromise(
      Cursor.commit(Chunk.fromIterable([makeUnit(50), makeUnit(40)])).pipe(
        Effect.provide(Cursor.layer({ cursor, feed, foreignKeySource: 'test', highKey: 0, stats: { newMessages: 0 } })),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(cursor.high).toBe('50');
    expect(cursor.low).toBeUndefined();
  });

  test('trackRange: true sets both high and low on the first (descending) page, then raises only high on a later ascending page', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));

    const makeUnit = (key: number): Cursor.CommitUnit => ({
      object: Expando.make({ [Obj.Meta]: { keys: [{ id: `id-${key}`, source: 'test' }] }, key }),
      foreignId: `id-${key}`,
      key,
    });

    await EffectEx.runPromise(
      Cursor.commit(Chunk.fromIterable([makeUnit(50), makeUnit(40)])).pipe(
        Effect.provide(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            highKey: 0,
            lowKey: 0,
            trackRange: true,
            stats: { newMessages: 0 },
          }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(cursor.high).toBe('50');
    expect(cursor.low).toBe('40');

    await EffectEx.runPromise(
      Cursor.commit(Chunk.fromIterable([makeUnit(60), makeUnit(70)])).pipe(
        Effect.provide(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            highKey: Cursor.parseKey(cursor.high),
            lowKey: Cursor.parseKey(cursor.low),
            trackRange: true,
            stats: { newMessages: 0 },
          }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(cursor.high).toBe('70');
    expect(cursor.low).toBe('40');
  });

  test(
    'dedupStage folds every considered key into state.scanned, even when dropped by the dedup set — ' +
      'the stall-proofing seam for a crash that landed items in the feed before the cursor low advance persisted',
    async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
      const feed = db.add(Feed.make());
      const target = db.add(Expando.make({ name: 'mailbox' }));
      const cursor = db.add(
        Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), high: '100', low: '50' }),
      );

      // Simulates a crash between the feed append and the cursor's `low` advance: these items already
      // landed in the feed (so the dedup seed picks them up), but `low` is still 50 even though both
      // are older than it.
      await EffectEx.runPromise(
        Feed.append(feed, [
          Expando.make({ [Obj.Meta]: { keys: [{ id: 'orphaned-a', source: 'test' }] }, key: 30 }),
          Expando.make({ [Obj.Meta]: { keys: [{ id: 'orphaned-b', source: 'test' }] }, key: 20 }),
        ]).pipe(Effect.provide(Database.layer(db))),
      );

      const scanned = await Effect.gen(function* () {
        yield* Stream.fromIterable([
          { id: 'orphaned-a', key: 30 },
          { id: 'orphaned-b', key: 20 },
        ]).pipe(
          Cursor.dedupStage(
            'dedup',
            (item: { id: string; key: number }) => item.id,
            (item: { id: string; key: number }) => item.key,
          ),
          Stream.runDrain,
        );
        return (yield* Cursor.Service).scanned;
      }).pipe(
        Effect.provide(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            highKey: 100,
            lowKey: 50,
            trackRange: true,
            stats: { newMessages: 0 },
          }),
        ),
        Effect.provide(Database.layer(db)),
        EffectEx.runAndForwardErrors,
      );

      expect(scanned).toEqual({ maxKey: 30, minKey: 20 });
      // Both items were dropped via the dedup set — nothing committed, so `low` hasn't moved yet.
      expect(cursor.low).toBe('50');

      // The stall-proofing seam: fold the scanned extent in even though nothing newly committed, so a
      // re-run's backward window shrinks instead of re-scanning (and re-dropping) the same items forever.
      Cursor.extendRange(cursor, scanned);
      expect(cursor.low).toBe('20');
      expect(cursor.high).toBe('100'); // Unaffected — scanned.maxKey (30) doesn't exceed `high`.
    },
  );

  test(
    'the high-boundary item is deduped even after the newest-by-insertion seed window has aged past it — ' +
      'regression: the newest message was re-committed on every backfill run',
    async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
      const feed = db.add(Feed.make());
      const target = db.add(Expando.make({ name: 'mailbox' }));

      // Insertion order mirrors a backfilling bidirectional sync: the newest message (key 100 = `high`)
      // is committed FIRST (the initial backward run walks newest-first), then successively older
      // messages are appended as later runs backfill. So `high`'s item is the OLDEST insertion.
      const keys = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
      await EffectEx.runPromise(
        Feed.append(
          feed,
          keys.map((key) => Expando.make({ [Obj.Meta]: { keys: [{ id: `id-${key}`, source: 'test' }] }, key })),
        ).pipe(Effect.provide(Database.layer(db))),
      );

      const cursor = db.add(
        Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), high: '100', low: '10' }),
      );

      // A seed tail smaller than the number of items backfilled after `high` — so a newest-only seed
      // would NOT contain `high`'s item, exactly the production case with >500 backfilled messages.
      const layer = Cursor.layer({
        cursor,
        feed,
        foreignKeySource: 'test',
        highKey: 100,
        lowKey: 10,
        trackRange: true,
        dedupSeedTail: 3,
        stats: { newMessages: 0 },
      });

      const { seedHasHigh, boundaryDropped } = await Effect.gen(function* () {
        const state = yield* Cursor.Service;
        // The forward window re-fetches `key === high` inclusively (same-ms siblings); the strict range
        // check (`low < key < high`) does NOT drop it, so it must be caught by the dedup set.
        const output: string[] = [];
        yield* Stream.fromIterable([{ id: 'id-100', key: 100 }]).pipe(
          Cursor.dedupStage(
            'dedup',
            (item: { id: string; key: number }) => item.id,
            (item: { id: string; key: number }) => item.key,
          ),
          Stream.tap((item) => Effect.sync(() => output.push(item.id))),
          Stream.runDrain,
        );
        return { seedHasHigh: state.dedupSet.has('id-100'), boundaryDropped: output.length === 0 };
      }).pipe(Effect.provide(layer), Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

      expect(seedHasHigh).toBe(true);
      expect(boundaryDropped).toBe(true);
    },
  );

  test(
    'a single-directional run drops a key === 0 item below an advanced high; a range run keeps it — ' +
      'regression: trackRange gates the interior shortcut so the low bound never strands a fallback key',
    async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
      const feed = db.add(Feed.make());
      const target = db.add(Expando.make({ name: 'mailbox' }));
      const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), high: '100' }));

      // The dedup set is empty (empty feed), so the drop decision is purely the interior shortcut. A
      // `key === 0` fallback (e.g. a dateless single-directional item) sits below the advanced `high`.
      const dropUnder = (trackRange: boolean, lowKey: number) =>
        Effect.gen(function* () {
          const output: number[] = [];
          yield* Stream.fromIterable([{ id: 'id-0', key: 0 }]).pipe(
            Cursor.dedupStage(
              'dedup',
              (item: { id: string; key: number }) => item.id,
              (item: { id: string; key: number }) => item.key,
            ),
            Stream.tap((item) => Effect.sync(() => output.push(item.key))),
            Stream.runDrain,
          );
          return output.length === 0;
        }).pipe(
          Effect.provide(
            Cursor.layer({
              cursor,
              feed,
              foreignKeySource: 'test',
              highKey: 100,
              lowKey,
              trackRange,
              stats: { newMessages: 0 },
            }),
          ),
          Effect.provide(Database.layer(db)),
          EffectEx.runAndForwardErrors,
        );

      // Single-directional: `key < high` still drops the fallback (original semantics preserved).
      expect(await dropUnder(false, 0)).toBe(true);
      // Range: the strict interior `low < key < high` must NOT drop below `low` (the backfill region).
      expect(await dropUnder(true, 0)).toBe(false);
    },
  );
});

describe('resolveHorizon', () => {
  const NOW = new Date('2026-07-06T00:00:00.000Z');

  const addCalendarDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  test('defaults to 30 days before now', ({ expect }) => {
    expect(Cursor.resolveHorizon({ now: NOW })).toEqual(addCalendarDays(NOW, -30));
  });

  test('syncBackDays overrides the default', ({ expect }) => {
    expect(Cursor.resolveHorizon({ now: NOW, syncBackDays: 7 })).toEqual(addCalendarDays(NOW, -7));
  });
});

describe('resolveWindows', () => {
  const NOW = new Date('2026-07-06T00:00:00.000Z');

  const addCalendarDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const horizon = (days: number) => addCalendarDays(NOW, -days);

  test('never synced (highKey 0) → backward-only, covering the whole horizon', ({ expect }) => {
    const windows = Cursor.resolveWindows({ highKey: 0, lowKey: 0, now: NOW, horizon: horizon(30) });
    expect(windows.forward).toBeUndefined();
    expect(windows.backward).toEqual({ direction: 'backward', start: horizon(30), end: addCalendarDays(NOW, 1) });
  });

  test('synced before, horizon below low → both forward and backward windows', ({ expect }) => {
    const highKey = new Date('2026-07-01T00:00:00.000Z').getTime();
    const lowKey = new Date('2026-06-20T00:00:00.000Z').getTime();
    const windows = Cursor.resolveWindows({ highKey, lowKey, now: NOW, horizon: horizon(30) });
    expect(windows.forward).toEqual({ direction: 'forward', start: new Date(highKey), end: addCalendarDays(NOW, 1) });
    expect(windows.backward).toEqual({ direction: 'backward', start: horizon(30), end: new Date(lowKey) });
  });

  test('backward absent once the horizon has reached (or passed) low — backfill complete', ({ expect }) => {
    const highKey = new Date('2026-07-01T00:00:00.000Z').getTime();
    const lowKey = horizon(30).getTime();
    const windows = Cursor.resolveWindows({ highKey, lowKey, now: NOW, horizon: horizon(30) });
    expect(windows.forward).toBeDefined();
    expect(windows.backward).toBeUndefined();
  });

  test('widening syncBackDays moves the horizon below low and reopens the backward window', ({ expect }) => {
    const highKey = new Date('2026-07-01T00:00:00.000Z').getTime();
    const lowKey = horizon(30).getTime();
    // Backfill previously completed at the 30-day horizon; widening to 60 days reopens it.
    const complete = Cursor.resolveWindows({ highKey, lowKey, now: NOW, horizon: horizon(30) });
    expect(complete.backward).toBeUndefined();

    const widened = Cursor.resolveWindows({ highKey, lowKey, now: NOW, horizon: horizon(60) });
    expect(widened.backward).toEqual({ direction: 'backward', start: horizon(60), end: new Date(lowKey) });
  });

  test('unset low (lowKey 0) is defensively treated as high — no backward window if the horizon has already reached high', ({
    expect,
  }) => {
    const highKey = horizon(10).getTime();
    const windows = Cursor.resolveWindows({ highKey, lowKey: 0, now: NOW, horizon: horizon(30) });
    expect(windows.forward).toBeDefined();
    expect(windows.backward).toEqual({ direction: 'backward', start: horizon(30), end: new Date(highKey) });
  });
});

describe('completeBackfill', () => {
  test('no-op when high is unset — nothing synced yet, so there is no floor to clamp', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed] });
    const feed = db.add(Feed.make());
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(feed) }));

    Cursor.completeBackfill(cursor, new Date('2026-06-01').getTime());
    expect(cursor.low).toBeUndefined();
    await builder.close();
  });

  test('clamps low down to the horizon, establishing it the first time', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed] });
    const feed = db.add(Feed.make());
    const cursor = db.add(
      Cursor.makeFeed({
        source: Ref.make(feed),
        target: Ref.make(feed),
        high: String(new Date('2026-07-01').getTime()),
      }),
    );

    const horizonKey = new Date('2026-06-01').getTime();
    Cursor.completeBackfill(cursor, horizonKey);
    expect(cursor.low).toBe(String(horizonKey));
    await builder.close();
  });

  test('is monotone-down: a later call with a newer (advanced) horizon is a no-op', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed] });
    const feed = db.add(Feed.make());
    const highKey = new Date('2026-07-01').getTime();
    const firstHorizon = new Date('2026-06-01').getTime();
    const cursor = db.add(
      Cursor.makeFeed({
        source: Ref.make(feed),
        target: Ref.make(feed),
        high: String(highKey),
        low: String(firstHorizon),
      }),
    );

    // The horizon advances a day later (syncBackDays unchanged) — still above the already-clamped low.
    Cursor.completeBackfill(cursor, firstHorizon + 24 * 60 * 60 * 1000);
    expect(cursor.low).toBe(String(firstHorizon));
    await builder.close();
  });

  test('a wider syncBackDays (lower horizon) clamps low further down', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed] });
    const feed = db.add(Feed.make());
    const highKey = new Date('2026-07-01').getTime();
    const firstHorizon = new Date('2026-06-01').getTime();
    const cursor = db.add(
      Cursor.makeFeed({
        source: Ref.make(feed),
        target: Ref.make(feed),
        high: String(highKey),
        low: String(firstHorizon),
      }),
    );

    const widerHorizon = new Date('2026-05-01').getTime();
    Cursor.completeBackfill(cursor, widerHorizon);
    expect(cursor.low).toBe(String(widerHorizon));
    await builder.close();
  });
});
