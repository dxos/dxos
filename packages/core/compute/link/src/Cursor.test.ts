//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Expando } from '@dxos/schema';

import * as AccessToken from './AccessToken.ts';
import * as Cursor from './Cursor.ts';

/** Two schema versions of one keyed type. */
class KeyedV1 extends Type.makeObject<KeyedV1>(DXN.make('com.example.type.keyed', '0.1.0'))(Schema.Struct({})) {}
class KeyedV2 extends Type.makeObject<KeyedV2>(DXN.make('com.example.type.keyed', '0.2.0'))(Schema.Struct({})) {}

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
        Layer.provideMerge(
          Cursor.layer({
            cursor,
            foreignKeySource: 'test',
            maxKey: 0,
            stats: { newMessages: 0 },
          }),
          Database.layer(db),
        ),
      ),
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
      Cursor.commit([makeUnit(50), makeUnit(40)]).pipe(
        Effect.provide(
          Layer.provideMerge(
            Cursor.layer({ cursor, feed, foreignKeySource: 'test', maxKey: 0, stats: { newMessages: 0 } }),
            Database.layer(db),
          ),
        ),
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
      Cursor.commit([makeUnit(50), makeUnit(40)]).pipe(
        Effect.provide(
          Layer.provideMerge(
            Cursor.layer({
              cursor,
              feed,
              foreignKeySource: 'test',
              maxKey: 0,
              minKey: 0,
              trackRange: true,
              stats: { newMessages: 0 },
            }),
            Database.layer(db),
          ),
        ),
      ),
    );

    expect(cursor.max).toBe('50');
    expect(cursor.min).toBe('40');

    await EffectEx.runPromise(
      Cursor.commit([makeUnit(60), makeUnit(70)]).pipe(
        Effect.provide(
          Layer.provideMerge(
            Cursor.layer({
              cursor,
              feed,
              foreignKeySource: 'test',
              maxKey: Cursor.parseKey(cursor.max),
              minKey: Cursor.parseKey(cursor.min),
              trackRange: true,
              stats: { newMessages: 0 },
            }),
            Database.layer(db),
          ),
        ),
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
          Layer.provideMerge(
            Cursor.layer({
              cursor,
              feed,
              foreignKeySource: 'test',
              maxKey: 100,
              minKey: 50,
              trackRange: true,
              stats: { newMessages: 0 },
            }),
            Database.layer(db),
          ),
        ),
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
      }).pipe(Effect.provide(Layer.provideMerge(layer, Database.layer(db))), EffectEx.runAndForwardErrors);

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
            Layer.provideMerge(
              Cursor.layer({
                cursor,
                feed,
                foreignKeySource: 'test',
                maxKey: 100,
                minKey,
                trackRange,
                stats: { newMessages: 0 },
              }),
              Database.layer(db),
            ),
          ),
          EffectEx.runAndForwardErrors,
        );

      // Single-directional: `key < max` still drops the fallback (original semantics preserved).
      expect(await dropUnder(false, 0)).toBe(true);
      // Range: the strict interior `min < key < max` must NOT drop below `min` (the backfill region).
      expect(await dropUnder(true, 0)).toBe(false);
    },
  );

  // Regression: one 500-object seed read of HTML mail measured 47 MB in production, past EDGE's 32 MiB
  // query RPC cap, and failed every sync run.
  test('the dedup seed reads each end of the feed a page at a time, counting only the keyed type', async ({
    expect,
  }) => {
    const { db, host } = await builder.createDatabase({
      types: [Cursor.Cursor, Feed.Feed, Expando.Expando, TestSchema.Task],
    });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));

    // Each keyed object is followed by an un-keyed one, as a mailbox feed holds attachment blobs.
    await EffectEx.runPromise(
      Feed.append(
        feed,
        Array.from({ length: 20 }, (_, index) => [
          Expando.make({ [Obj.Meta]: { keys: [{ id: `id-${index}`, source: 'test' }] } }),
          Obj.make(TestSchema.Task, { title: `attachment-${index}` }),
        ]).flat(),
      ).pipe(Effect.provide(Database.layer(db))),
    );

    const pages = recordFeedReads(host, feed);
    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: 0,
            stats: { newMessages: 0 },
            dedupSeedTail: 7,
            dedupSeedPageSize: 3,
            dedupSeedType: Expando.Expando,
          }),
          Database.layer(db),
        ),
      ),
      EffectEx.runAndForwardErrors,
    );

    const oldest = [0, 1, 2, 3, 4, 5, 6];
    const newest = [13, 14, 15, 16, 17, 18, 19];
    expect([...state.dedupSet].sort()).toEqual([...oldest, ...newest].map((index) => `id-${index}`).sort());
    // Seven per end, newest end first, at most three per read.
    expect(pages).toEqual([3, 3, 1, 3, 3, 1]);
  });

  test('the dedup seed matches its type across schema versions', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Cursor.Cursor, Feed.Feed, Expando.Expando, KeyedV1, KeyedV2],
    });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));
    // Objects written before a schema bump keep the version they were written under.
    await EffectEx.runPromise(
      Feed.append(feed, [
        Obj.make(KeyedV1, { [Obj.Meta]: { keys: [{ id: 'written-under-v1', source: 'test' }] } }),
        Obj.make(KeyedV2, { [Obj.Meta]: { keys: [{ id: 'written-under-v2', source: 'test' }] } }),
      ]).pipe(Effect.provide(Database.layer(db))),
    );

    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: 0,
            stats: { newMessages: 0 },
            dedupSeedType: KeyedV2,
          }),
          Database.layer(db),
        ),
      ),
      EffectEx.runAndForwardErrors,
    );

    expect([...state.dedupSet].sort()).toEqual(['written-under-v1', 'written-under-v2']);
  });

  test('a feed shorter than the dedup seed tail is read once, from the newest end', async ({ expect }) => {
    const { db, host } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));
    await EffectEx.runPromise(
      Feed.append(
        feed,
        Array.from({ length: 5 }, (_, index) =>
          Expando.make({ [Obj.Meta]: { keys: [{ id: `id-${index}`, source: 'test' }] } }),
        ),
      ).pipe(Effect.provide(Database.layer(db))),
    );

    const pages = recordFeedReads(host, feed);
    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Cursor.layer({ cursor, feed, foreignKeySource: 'test', maxKey: 0, stats: { newMessages: 0 } }),
          Database.layer(db),
        ),
      ),
      EffectEx.runAndForwardErrors,
    );

    expect(state.dedupSet.size).toBe(5);
    // A short page reached the start of the feed, so the oldest end is already covered.
    expect(pages).toEqual([5]);
  });
});

/**
 * Records how many objects each host query response scoped to `feed` carries, from now on.
 * `normalizeHandlers` resolves the handler per call, so replacing it reaches every client query.
 */
const recordFeedReads = (
  host: Awaited<ReturnType<EchoTestBuilder['createDatabase']>>['host'],
  feed: Feed.Feed,
): number[] => {
  const feedUri = String(Feed.getFeedUri(feed));
  const queryService = host.queryService;
  const execQuery = queryService['QueryService.execQuery'].bind(queryService);
  const counts: number[] = [];
  queryService['QueryService.execQuery'] = (request) =>
    execQuery(request).pipe(
      Stream.tap((response) =>
        Effect.sync(() => {
          if (request.query.includes(feedUri)) {
            counts.push(response.results?.length ?? 0);
          }
        }),
      ),
    );
  return counts;
};

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

  test('writeSyncState advances the token and tag heads together', async ({ expect }) => {
    const cursor = await makeExternalCursor();
    expect(Cursor.readTagHeads(cursor)).toBeUndefined();

    Cursor.writeSyncState(cursor, { token: 'history-1', tagHeads: ['head-a'] });
    expect(Cursor.readToken(cursor)).toBe('history-1');
    expect([...Cursor.readTagHeads(cursor)!]).toEqual(['head-a']);

    Cursor.writeSyncState(cursor, { token: 'history-2', tagHeads: ['head-b', 'head-c'] });
    expect(Cursor.readToken(cursor)).toBe('history-2');
    expect([...Cursor.readTagHeads(cursor)!]).toEqual(['head-b', 'head-c']);
  });

  test('writeSyncState leaves an omitted field untouched', async ({ expect }) => {
    const cursor = await makeExternalCursor();
    Cursor.writeSyncState(cursor, { token: 'history-1', tagHeads: ['head-a'] });

    // A provider with no delta token still records heads, and vice versa.
    Cursor.writeSyncState(cursor, { tagHeads: ['head-b'] });
    expect(Cursor.readToken(cursor)).toBe('history-1');
    expect([...Cursor.readTagHeads(cursor)!]).toEqual(['head-b']);

    Cursor.writeSyncState(cursor, { token: 'history-2' });
    expect(Cursor.readToken(cursor)).toBe('history-2');
    expect([...Cursor.readTagHeads(cursor)!]).toEqual(['head-b']);
  });

  test('tag heads survive a token clear — a stale delta does not invalidate the base', async ({ expect }) => {
    const cursor = await makeExternalCursor();
    Cursor.writeSyncState(cursor, { token: 'history-1', tagHeads: ['head-a'] });

    // Gmail answers 404 for a stale historyId and the run falls back to a window scan; the tag base
    // is still a valid description of what the index looked like, so it must not be dropped with it.
    Cursor.clearToken(cursor);
    expect(Cursor.readToken(cursor)).toBeUndefined();
    expect([...Cursor.readTagHeads(cursor)!]).toEqual(['head-a']);
  });

  test('deltaIds persist while the token holds and clear when it advances or is cleared', async ({ expect }) => {
    const cursor = await makeExternalCursor();
    Cursor.writeSyncState(cursor, { token: 'history-1' });
    expect(Cursor.readDeltaIds(cursor)).toEqual([]);

    Cursor.writeSyncState(cursor, { deltaIds: ['msg-1', 'msg-2'] });
    expect(Cursor.readToken(cursor)).toBe('history-1');
    expect([...Cursor.readDeltaIds(cursor)]).toEqual(['msg-1', 'msg-2']);

    // The ids name messages past `history-1`, so a new token drops them.
    Cursor.writeSyncState(cursor, { token: 'history-2', tagHeads: ['head-a'] });
    expect(Cursor.readDeltaIds(cursor)).toEqual([]);

    Cursor.writeSyncState(cursor, { deltaIds: ['msg-3'] });
    Cursor.clearToken(cursor);
    expect(Cursor.readDeltaIds(cursor)).toEqual([]);
  });

  test('snapshot writes cost O(changed entry): unchanged rewrites write nothing', async ({ expect }) => {
    const cursor = await makeExternalCursor();
    const description = 'x'.repeat(200);
    const snapshot = (index: number) => ({ title: `Issue ${index}`, description, status: 'todo' });
    for (let index = 0; index < 20; index++) {
      Cursor.writeSnapshot(cursor, String(index), snapshot(index));
    }
    const changeCount = Obj.getChanges(cursor).length;

    // A re-sync of unchanged items must not grow the history.
    for (let index = 0; index < 20; index++) {
      Cursor.writeSnapshot(cursor, String(index), snapshot(index));
    }
    expect(Obj.getChanges(cursor).length).toBe(changeCount);

    // Changing one entry must not rewrite the other 19.
    Cursor.writeSnapshot(cursor, '0', { ...snapshot(0), status: 'done' });
    const changes = Obj.getChanges(cursor);
    expect(changes.length).toBe(changeCount + 1);
    expect(changes.at(-1)?.ops ?? Infinity).toBeLessThan(description.length * 2);
    expect(Cursor.readSnapshot(cursor, '0')).toEqual({ ...snapshot(0), status: 'done' });
    expect(Cursor.readSnapshot(cursor, '19')).toEqual(snapshot(19));
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

describe('foreignIndex (reconcileFilter)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('maps the reconcile filter’s foreignIds to their EntityIds', async ({ expect }) => {
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
        Layer.provideMerge(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: 0,
            // Resolve only the two messages the reconcile targets, not the whole feed.
            reconcileFilter: Filter.foreignKeys(Expando.Expando, [
              { source: 'test', id: 'id-10' },
              { source: 'test', id: 'id-30' },
            ]),
            stats: { newMessages: 0 },
          }),
          Database.layer(db),
        ),
      ),
      EffectEx.runAndForwardErrors,
    );

    expect(state.foreignIndex).toBeDefined();
    expect([...state.foreignIndex!.keys()].sort()).toEqual(['id-10', 'id-30']);
    // The mapped EntityId is the feed message's own id.
    expect(state.foreignIndex!.get('id-10')).toBe(items[0].id);
    expect(state.foreignIndex!.get('id-30')).toBe(items[2].id);
  });

  test('is absent when no reconcileFilter is set — the add-only path pays nothing', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));

    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Cursor.layer({ cursor, feed, foreignKeySource: 'test', maxKey: 0, stats: { newMessages: 0 } }),
          Database.layer(db),
        ),
      ),
      EffectEx.runAndForwardErrors,
    );

    expect(state.foreignIndex).toBeUndefined();
  });
});

describe('dedupStage with delta items', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  type Item = { id: string; key: number; fromDelta: boolean };

  test('a delta item at or above min is kept whatever its date; one below min is left to the backfill', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), max: '100', min: '50' }));
    await EffectEx.runPromise(
      Feed.append(feed, [
        Expando.make({ [Obj.Meta]: { keys: [{ id: 'committed-60', source: 'test' }] }, key: 60 }),
      ]).pipe(Effect.provide(Database.layer(db))),
    );
    const deltaHandled = new Set(['replayed-70']);

    const { kept, extent } = await Effect.gen(function* () {
      const kept = yield* Stream.fromIterable<Item>([
        // An import keeping its original date: new, but dated inside (min, max).
        { id: 'imported-80', key: 80, fromDelta: true },
        // Handled by an earlier run under the same token, and already in the feed.
        { id: 'replayed-70', key: 70, fromDelta: true },
        { id: 'committed-60', key: 60, fromDelta: true },
        // Below `min`: the backward window lists it by date, and it must not lower `min` meanwhile.
        { id: 'imported-40', key: 40, fromDelta: true },
        // Listed by a date window, so the interior shortcut still drops it.
        { id: 'window-90', key: 90, fromDelta: false },
      ]).pipe(
        Cursor.dedupStage(
          'dedup',
          (item: Item) => item.id,
          (item: Item) => item.key,
          (item: Item) => item.fromDelta,
        ),
        Stream.runCollect,
      );
      return { kept, extent: (yield* Cursor.Service).extent };
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: 100,
            minKey: 50,
            trackRange: true,
            dedupSeedType: Expando.Expando,
            stats: { newMessages: 0 },
            deltaHandled,
          }),
          Database.layer(db),
        ),
      ),
      EffectEx.runAndForwardErrors,
    );

    expect([...kept].map((item) => item.id)).toEqual(['imported-80']);
    expect([...deltaHandled].sort()).toEqual(['committed-60', 'imported-40', 'replayed-70']);
    expect(extent).toEqual({ maxKey: 90, minKey: 90 });
  });

  test('a delta id the backward window also lists below min commits once, from the window', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), max: '100', min: '50' }));

    const { kept, extent } = await Effect.gen(function* () {
      const kept = yield* Stream.fromIterable<Item>([
        { id: 'both-40', key: 40, fromDelta: true },
        { id: 'both-40', key: 40, fromDelta: false },
        { id: 'window-30', key: 30, fromDelta: false },
      ]).pipe(
        Cursor.dedupStage(
          'dedup',
          (item: Item) => item.id,
          (item: Item) => item.key,
          (item: Item) => item.fromDelta,
        ),
        Stream.runCollect,
      );
      return { kept, extent: (yield* Cursor.Service).extent };
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: 100,
            minKey: 50,
            trackRange: true,
            dedupSeedType: Expando.Expando,
            stats: { newMessages: 0 },
            deltaHandled: new Set(),
          }),
          Database.layer(db),
        ),
      ),
      EffectEx.runAndForwardErrors,
    );

    expect([...kept]).toEqual([
      { id: 'both-40', key: 40, fromDelta: false },
      { id: 'window-30', key: 30, fromDelta: false },
    ]);
    expect(extent).toEqual({ maxKey: 40, minKey: 30 });
  });

  const runDedup = async (cursorKeys: { max?: string; min?: string }, items: Item[]) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'mailbox' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), ...cursorKeys }));
    return Stream.fromIterable(items).pipe(
      Cursor.dedupStage(
        'dedup',
        (item: Item) => item.id,
        (item: Item) => item.key,
        (item: Item) => item.fromDelta,
      ),
      Stream.runCollect,
      Effect.map((kept) => [...kept]),
      Effect.provide(
        Layer.provideMerge(
          Cursor.layer({
            cursor,
            feed,
            foreignKeySource: 'test',
            maxKey: Cursor.parseKey(cursorKeys.max),
            minKey: Cursor.parseKey(cursorKeys.min),
            trackRange: true,
            dedupSeedType: Expando.Expando,
            stats: { newMessages: 0 },
            deltaHandled: new Set(),
          }),
          Database.layer(db),
        ),
      ),
      EffectEx.runAndForwardErrors,
    );
  };

  test('a never-synced cursor leaves a delta id to the backward window, which lists it once', async ({ expect }) => {
    const kept = await runDedup({}, [
      { id: 'both-80', key: 80, fromDelta: true },
      { id: 'both-80', key: 80, fromDelta: false },
    ]);
    expect(kept).toEqual([{ id: 'both-80', key: 80, fromDelta: false }]);
  });

  test('with min unset the split falls back to max, as the backward window does', async ({ expect }) => {
    const kept = await runDedup({ max: '100' }, [
      { id: 'imported-40', key: 40, fromDelta: true },
      { id: 'arrival-120', key: 120, fromDelta: true },
    ]);
    expect(kept.map((item) => item.id)).toEqual(['arrival-120']);
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
      Cursor.commit([retagUnit]).pipe(
        Effect.provide(
          Layer.provideMerge(
            Cursor.layer({
              cursor,
              feed,
              foreignKeySource: 'test',
              maxKey: 100,
              minKey: 0,
              trackRange: true,
              stats: { newMessages: 0 },
            }),
            Database.layer(db),
          ),
        ),
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
      Cursor.commit([appendUnit, retagUnit]).pipe(
        Effect.provide(
          Layer.provideMerge(
            Cursor.layer({
              cursor,
              feed,
              foreignKeySource: 'test',
              maxKey: 0,
              minKey: 0,
              trackRange: true,
              stats: { newMessages: 0 },
            }),
            Database.layer(db),
          ),
        ),
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
