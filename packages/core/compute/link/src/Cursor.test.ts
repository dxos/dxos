//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Expando } from '@dxos/schema';

import * as AccessToken from './AccessToken';
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
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), max: 'seed' }));

    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(
        Cursor.layer({
          cursor,
          foreignKeySource: 'test',
          maxKey: 0,
          stats: { newMessages: 0 },
        }),
      ),
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

    expect(state.cursor.id).toBe(cursor.id);
    expect(state.cursor.max).toBe('seed');
    expect(state.minKey).toBe(0);
    expect(state.trackRange).toBe(false);
    expect(Cursor.isFeed(cursor)).toBe(true);
  });

  test("trackRange: false (the default) never touches min, even when a page's min key is lower", async ({ expect }) => {
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
        Effect.provide(Cursor.layer({ cursor, feed, foreignKeySource: 'test', maxKey: 0, stats: { newMessages: 0 } })),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(cursor.max).toBe('50');
    expect(cursor.min).toBeUndefined();
  });

  test('trackRange: true sets both max and min on the first (descending) page, then raises only max on a later ascending page', async ({
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
            maxKey: 0,
            minKey: 0,
            trackRange: true,
            stats: { newMessages: 0 },
          }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(cursor.max).toBe('50');
    expect(cursor.min).toBe('40');

    await EffectEx.runPromise(
      Cursor.commit(Chunk.fromIterable([makeUnit(60), makeUnit(70)])).pipe(
        Effect.provide(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: Cursor.parseKey(cursor.max),
            minKey: Cursor.parseKey(cursor.min),
            trackRange: true,
            stats: { newMessages: 0 },
          }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(cursor.max).toBe('70');
    expect(cursor.min).toBe('40');
  });

  test(
    'dedupStage folds every considered key into state.extent, even when dropped by the dedup set — ' +
      'the stall-proofing seam for a crash that landed items in the feed before the cursor min advance persisted',
    async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
      const feed = db.add(Feed.make());
      const target = db.add(Expando.make({ name: 'mailbox' }));
      const cursor = db.add(
        Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), max: '100', min: '50' }),
      );

      // Simulates a crash between the feed append and the `min` advance: the items landed in the feed
      // (so the seed picks them up) but `min` is still 50 though both are older.
      await EffectEx.runPromise(
        Feed.append(feed, [
          Expando.make({ [Obj.Meta]: { keys: [{ id: 'orphaned-a', source: 'test' }] }, key: 30 }),
          Expando.make({ [Obj.Meta]: { keys: [{ id: 'orphaned-b', source: 'test' }] }, key: 20 }),
        ]).pipe(Effect.provide(Database.layer(db))),
      );

      const extent = await Effect.gen(function* () {
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
        return (yield* Cursor.Service).extent;
      }).pipe(
        Effect.provide(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: 100,
            minKey: 50,
            trackRange: true,
            stats: { newMessages: 0 },
          }),
        ),
        Effect.provide(Database.layer(db)),
        EffectEx.runAndForwardErrors,
      );

      expect(extent).toEqual({ maxKey: 30, minKey: 20 });
      // Both items were dropped via the dedup set — nothing committed, so `min` hasn't moved yet.
      expect(cursor.min).toBe('50');

      // Stall-proofing: fold in the extent extent though nothing committed, so a re-run's backward
      // window shrinks instead of re-scanning the same items forever.
      Cursor.extendRange(cursor, extent);
      expect(cursor.min).toBe('20');
      expect(cursor.max).toBe('100'); // Unaffected — extent.maxKey (30) doesn't exceed `max`.
    },
  );

  test(
    'the high-boundary item is deduped even after the newest-by-insertion seed window has aged past it — ' +
      'regression: the newest message was re-committed on every backfill run',
    async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
      const feed = db.add(Feed.make());
      const target = db.add(Expando.make({ name: 'mailbox' }));

      // Insertion order mirrors a backfilling sync: newest (key 100 = `max`) committed FIRST, older
      // messages appended by later runs. So `max`'s item is the OLDEST insertion.
      const keys = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
      await EffectEx.runPromise(
        Feed.append(
          feed,
          keys.map((key) => Expando.make({ [Obj.Meta]: { keys: [{ id: `id-${key}`, source: 'test' }] }, key })),
        ).pipe(Effect.provide(Database.layer(db))),
      );

      const cursor = db.add(
        Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), max: '100', min: '10' }),
      );

      // Seed tail smaller than the items backfilled after `max`, so a newest-only seed would miss
      // `max`'s item — the production case with >500 backfilled messages.
      const layer = Cursor.layer({
        cursor,
        feed,
        foreignKeySource: 'test',
        maxKey: 100,
        minKey: 10,
        trackRange: true,
        dedupSeedTail: 3,
        stats: { newMessages: 0 },
      });

      const { seedHasHigh, boundaryDropped } = await Effect.gen(function* () {
        const state = yield* Cursor.Service;
        // The forward window re-fetches `key === max` inclusively; the strict range check doesn't drop
        // it, so the dedup set must.
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
    'a single-directional run drops a key === 0 item below an advanced max; a range run keeps it — ' +
      'regression: trackRange gates the interior shortcut so the min bound never strands a fallback key',
    async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
      const feed = db.add(Feed.make());
      const target = db.add(Expando.make({ name: 'mailbox' }));
      const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), max: '100' }));

      // Empty dedup set (empty feed), so the drop decision is purely the interior shortcut. A
      // `key === 0` fallback sits below the advanced `max`.
      const dropUnder = (trackRange: boolean, minKey: number) =>
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
              maxKey: 100,
              minKey,
              trackRange,
              stats: { newMessages: 0 },
            }),
          ),
          Effect.provide(Database.layer(db)),
          EffectEx.runAndForwardErrors,
        );

      // Single-directional: `key < max` still drops the fallback (original semantics preserved).
      expect(await dropUnder(false, 0)).toBe(true);
      // Range: the strict interior `min < key < max` must NOT drop below `min` (the backfill region).
      expect(await dropUnder(true, 0)).toBe(false);
    },
  );
});

describe('token accessors', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const makeExternalCursor = async () => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessToken.AccessToken, Expando.Expando] });
    const token = db.add(AccessToken.make({ source: 'gmail.com', token: 'secret' }));
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(
      Cursor.makeExternal({ source: Ref.make(token), target: Ref.make(target) }),
    ) as Cursor.ExternalCursor;
    return cursor;
  };

  test('round-trips the delta token, independently of max/min', async ({ expect }) => {
    const cursor = await makeExternalCursor();
    expect(Cursor.readToken(cursor)).toBeUndefined();

    Cursor.writeToken(cursor, 'history-123');
    expect(Cursor.readToken(cursor)).toBe('history-123');
    // The token lives on the spec, not the range watermarks.
    expect(cursor.max).toBeUndefined();
    expect(cursor.min).toBeUndefined();

    Cursor.writeToken(cursor, 'history-456');
    expect(Cursor.readToken(cursor)).toBe('history-456');

    Cursor.clearToken(cursor);
    expect(Cursor.readToken(cursor)).toBeUndefined();
  });

  test('the token is preserved alongside snapshots (both are opaque spec fields)', async ({ expect }) => {
    const cursor = await makeExternalCursor();
    Cursor.writeToken(cursor, 'state-abc');
    Cursor.writeSnapshot(cursor, 'msg-1', { flagged: true });
    expect(Cursor.readToken(cursor)).toBe('state-abc');
    expect(Cursor.readSnapshot(cursor, 'msg-1')).toEqual({ flagged: true });

    Cursor.clearToken(cursor);
    expect(Cursor.readToken(cursor)).toBeUndefined();
    expect(Cursor.readSnapshot(cursor, 'msg-1')).toEqual({ flagged: true });
  });
});

describe('foreignIndex (buildEntityMap)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('maps every committed foreignId to its EntityId, matching dedup-set membership', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));

    const items = [10, 20, 30].map((key) =>
      Expando.make({ [Obj.Meta]: { keys: [{ id: `id-${key}`, source: 'test' }] }, key }),
    );
    await EffectEx.runPromise(Feed.append(feed, items).pipe(Effect.provide(Database.layer(db))));

    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(
        Cursor.layer({
          cursor,
          feed,
          foreignKeySource: 'test',
          maxKey: 0,
          buildEntityMap: true,
          stats: { newMessages: 0 },
        }),
      ),
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

    expect(state.foreignIndex).toBeDefined();
    expect([...state.foreignIndex!.keys()].sort()).toEqual(['id-10', 'id-20', 'id-30']);
    // Every foreignId in the dedup set resolves to a real EntityId via the index.
    for (const foreignId of state.dedupSet) {
      expect(state.foreignIndex!.get(foreignId)).toBeDefined();
    }
    // The mapped EntityId is the feed message's own id.
    expect(state.foreignIndex!.get('id-20')).toBe(items[1].id);
  });

  test('is absent when buildEntityMap is not set — the add-only path pays nothing', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));

    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(Cursor.layer({ cursor, feed, foreignKeySource: 'test', maxKey: 0, stats: { newMessages: 0 } })),
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

    expect(state.foreignIndex).toBeUndefined();
  });
});

describe('commit with objectless units', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('an objectless unit runs its commit effect without appending to the feed or moving max/min', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), max: '100' }));

    let effectRan = false;
    const retagUnit: Cursor.CommitUnit = {
      foreignId: 'id-existing',
      key: 0,
      commitEffects: [() => Effect.sync(() => (effectRan = true))],
    };

    await EffectEx.runPromise(
      Cursor.commit(Chunk.fromIterable([retagUnit])).pipe(
        Effect.provide(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: 100,
            minKey: 0,
            trackRange: true,
            stats: { newMessages: 0 },
          }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    expect(effectRan).toBe(true);
    // No feed append, so the feed is still empty.
    const feedItems = await EffectEx.runPromise(
      Feed.query(feed, Filter.everything()).run.pipe(Effect.provide(Database.layer(db))),
    );
    expect(feedItems.length).toBe(0);
    // key: 0 must not disturb the range watermarks.
    expect(cursor.max).toBe('100');
    expect(cursor.min).toBeUndefined();
  });

  test('a mixed page appends only the object-bearing unit and folds only its key', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));

    const appendUnit: Cursor.CommitUnit = {
      object: Expando.make({ [Obj.Meta]: { keys: [{ id: 'id-200', source: 'test' }] }, key: 200 }),
      foreignId: 'id-200',
      key: 200,
    };
    const retagUnit: Cursor.CommitUnit = { foreignId: 'id-existing', key: 0 };

    await EffectEx.runPromise(
      Cursor.commit(Chunk.fromIterable([appendUnit, retagUnit])).pipe(
        Effect.provide(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: 0,
            minKey: 0,
            trackRange: true,
            stats: { newMessages: 0 },
          }),
        ),
        Effect.provide(Database.layer(db)),
      ),
    );

    const feedItems = await EffectEx.runPromise(
      Feed.query(feed, Filter.everything()).run.pipe(Effect.provide(Database.layer(db))),
    );
    expect(feedItems.length).toBe(1);
    // Only the real key (200) folded; the objectless key: 0 did not lower min to 0.
    expect(cursor.max).toBe('200');
    expect(cursor.min).toBe('200');
  });
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

  test('never synced (maxKey 0) → backward-only, covering the whole horizon', ({ expect }) => {
    const windows = Cursor.resolveWindows({ maxKey: 0, minKey: 0, now: NOW, horizon: horizon(30) });
    expect(windows.forward).toBeUndefined();
    expect(windows.backward).toEqual({ direction: 'backward', start: horizon(30), end: addCalendarDays(NOW, 1) });
  });

  test('synced before, horizon below min → both forward and backward windows', ({ expect }) => {
    const maxKey = new Date('2026-07-01T00:00:00.000Z').getTime();
    const minKey = new Date('2026-06-20T00:00:00.000Z').getTime();
    const windows = Cursor.resolveWindows({ maxKey, minKey, now: NOW, horizon: horizon(30) });
    expect(windows.forward).toEqual({ direction: 'forward', start: new Date(maxKey), end: addCalendarDays(NOW, 1) });
    expect(windows.backward).toEqual({ direction: 'backward', start: horizon(30), end: new Date(minKey) });
  });

  test('backward absent once the horizon has reached (or passed) min — backfill complete', ({ expect }) => {
    const maxKey = new Date('2026-07-01T00:00:00.000Z').getTime();
    const minKey = horizon(30).getTime();
    const windows = Cursor.resolveWindows({ maxKey, minKey, now: NOW, horizon: horizon(30) });
    expect(windows.forward).toBeDefined();
    expect(windows.backward).toBeUndefined();
  });

  test('widening syncBackDays moves the horizon below min and reopens the backward window', ({ expect }) => {
    const maxKey = new Date('2026-07-01T00:00:00.000Z').getTime();
    const minKey = horizon(30).getTime();
    // Backfill previously completed at the 30-day horizon; widening to 60 days reopens it.
    const complete = Cursor.resolveWindows({ maxKey, minKey, now: NOW, horizon: horizon(30) });
    expect(complete.backward).toBeUndefined();

    const widened = Cursor.resolveWindows({ maxKey, minKey, now: NOW, horizon: horizon(60) });
    expect(widened.backward).toEqual({ direction: 'backward', start: horizon(60), end: new Date(minKey) });
  });

  test('unset min (minKey 0) is defensively treated as max — no backward window if the horizon has already reached max', ({
    expect,
  }) => {
    const maxKey = horizon(10).getTime();
    const windows = Cursor.resolveWindows({ maxKey, minKey: 0, now: NOW, horizon: horizon(30) });
    expect(windows.forward).toBeDefined();
    expect(windows.backward).toEqual({ direction: 'backward', start: horizon(30), end: new Date(maxKey) });
  });
});

describe('completeBackfill', () => {
  test('no-op when max is unset — nothing synced yet, so there is no floor to clamp', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed] });
    const feed = db.add(Feed.make());
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(feed) }));

    Cursor.completeBackfill(cursor, new Date('2026-06-01').getTime());
    expect(cursor.min).toBeUndefined();
    await builder.close();
  });

  test('clamps min down to the horizon, establishing it the first time', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed] });
    const feed = db.add(Feed.make());
    const cursor = db.add(
      Cursor.makeFeed({
        source: Ref.make(feed),
        target: Ref.make(feed),
        max: String(new Date('2026-07-01').getTime()),
      }),
    );

    const horizonKey = new Date('2026-06-01').getTime();
    Cursor.completeBackfill(cursor, horizonKey);
    expect(cursor.min).toBe(String(horizonKey));
    await builder.close();
  });

  test('is monotone-down: a later call with a newer (advanced) horizon is a no-op', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed] });
    const feed = db.add(Feed.make());
    const maxKey = new Date('2026-07-01').getTime();
    const firstHorizon = new Date('2026-06-01').getTime();
    const cursor = db.add(
      Cursor.makeFeed({
        source: Ref.make(feed),
        target: Ref.make(feed),
        max: String(maxKey),
        min: String(firstHorizon),
      }),
    );

    // The horizon advances a day later (syncBackDays unchanged) — still above the already-clamped min.
    Cursor.completeBackfill(cursor, firstHorizon + 24 * 60 * 60 * 1000);
    expect(cursor.min).toBe(String(firstHorizon));
    await builder.close();
  });

  test('a wider syncBackDays (lower horizon) clamps min further down', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed] });
    const feed = db.add(Feed.make());
    const maxKey = new Date('2026-07-01').getTime();
    const firstHorizon = new Date('2026-06-01').getTime();
    const cursor = db.add(
      Cursor.makeFeed({
        source: Ref.make(feed),
        target: Ref.make(feed),
        max: String(maxKey),
        min: String(firstHorizon),
      }),
    );

    const widerHorizon = new Date('2026-05-01').getTime();
    Cursor.completeBackfill(cursor, widerHorizon);
    expect(cursor.min).toBe(String(widerHorizon));
    await builder.close();
  });
});
