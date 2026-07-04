//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Stream from 'effect/Stream';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';
import { Expando } from '@dxos/schema';
import { AccessToken, Cursor } from '@dxos/types';

import * as Connection from './Connection';
import * as SyncBinding from './SyncBinding';

// A minimal end-to-end demonstration of cursor-based idempotency. A pipeline streams items through
// the reusable dedup stage into the commit sink; the binding's Cursor is the single durable position
// the run resumes from. We exercise: (1) a clean success, (2) a run that commits some pages then
// crashes mid-stream, and (3) a recovery run that re-processes the same source without duplicating
// anything already committed — driven entirely by the cursor + feed-seeded dedup set.
describe('SyncBinding cursor idempotency', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  const TEST_SOURCE = 'test.sync';

  // One remote item: a provider foreign id + a monotonic key (e.g. an updated-at time).
  type Item = { readonly id: string; readonly key: number };
  const ITEMS: readonly Item[] = [
    { id: 'a', key: 10 },
    { id: 'b', key: 20 },
    { id: 'c', key: 30 },
    { id: 'd', key: 40 },
  ];

  test('success → mid-run failure → recovery, without duplicates', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [
        Feed.Feed,
        Expando.Expando,
        AccessToken.AccessToken,
        Connection.Connection,
        Cursor.Cursor,
        SyncBinding.SyncBinding,
      ],
    });
    const feed = db.add(Feed.make({ name: 'items' }));
    const token = db.add(AccessToken.make({ source: TEST_SOURCE, token: 'tok' }));
    const connection = db.add(Connection.make({ connectorId: 'test', accessToken: Ref.make(token) }));
    // The target is unused by the pipeline; the feed stands in as a convenient local root.
    const binding = db.add(SyncBinding.make({ [Relation.Source]: connection, [Relation.Target]: feed }));
    await db.flush({ indexes: true });

    // Runs the pipeline once. `limit` simulates how much of the remote feed is available this run;
    // `fault` optionally crashes the stream after N committed units. Each run reads its starting
    // point from the binding's cursor — exactly as a real sync resumes.
    const sync = (options: { limit: number; fault?: Stage.Stage<SyncBinding.CommitUnit, SyncBinding.CommitUnit, Error> }) => {
      const cursorKey = Cursor.parseKey(binding.cursor.target?.value);
      const stats: SyncBinding.Stats = { newMessages: 0 };
      const mapped = Stream.fromIterable(ITEMS.slice(0, options.limit)).pipe(
        // Drops items already reflected by the cursor (key below the high-water mark) or already in
        // the feed (dedup set) — the idempotency gate.
        SyncBinding.dedupStage<Item>(
          'dedup',
          (item) => item.id,
          (item) => item.key,
        ),
        mapStage,
      );
      const effect = (options.fault ? mapped.pipe(options.fault) : mapped).pipe(
        // One item per page so each commit (and its cursor advance) lands independently.
        Stream.grouped(1),
        Pipeline.run({ sink: SyncBinding.commit }),
        Effect.provide(SyncBinding.layer({ binding, feed, foreignKeySource: TEST_SOURCE, cursorKey, stats })),
        Effect.provide(Database.layer(db)),
      );
      return { effect, stats };
    };

    // 1. Success: the first two items arrive and commit; the cursor advances to the highest key.
    const first = sync({ limit: 2 });
    await EffectEx.runPromise(first.effect);
    expect(await feedIds(db, feed)).toEqual(['a', 'b']);
    expect(binding.cursor.target?.value).toBe('20');
    expect(first.stats.newMessages).toBe(2);

    // 2. Failure: two more items are now available. Dedup skips a/b; `c` commits (cursor → 30), then
    //    the run crashes before `d`. The cursor reflects only what actually landed.
    const second = sync({ limit: 4, fault: faultAfter(1) });
    const exit = await EffectEx.runPromise(Effect.exit(second.effect));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(await feedIds(db, feed)).toEqual(['a', 'b', 'c']);
    expect(binding.cursor.target?.value).toBe('30');

    // 3. Recovery: re-run the same source. Dedup drops a/b (below cursor) and c (already in the feed);
    //    only `d` is new. No duplicates, and the cursor completes at the highest key.
    const third = sync({ limit: 4 });
    await EffectEx.runPromise(third.effect);
    expect(await feedIds(db, feed)).toEqual(['a', 'b', 'c', 'd']);
    expect(binding.cursor.target?.value).toBe('40');
    expect(third.stats.newMessages).toBe(1);
  });

  // Maps a remote item to a commit unit: an Expando stamped with the provider foreign key.
  const mapStage: Stage.Stage<Item, SyncBinding.CommitUnit, never, never> = Stage.map('map', (item: Item) =>
    Effect.succeed({
      message: Obj.make(Expando.Expando, { [Obj.Meta]: { keys: [{ source: TEST_SOURCE, id: item.id }] }, name: item.id }),
      foreignId: item.id,
      key: item.key,
      tagUris: [],
      extractedObjects: [],
    }),
  );

  // Fails the stream after `n` units pass through, simulating a crash mid-run.
  const faultAfter = (n: number): Stage.Stage<SyncBinding.CommitUnit, SyncBinding.CommitUnit, Error> => {
    let count = 0;
    return Stage.map('fault', (unit: SyncBinding.CommitUnit) => {
      count += 1;
      return count > n ? Effect.fail(new Error('injected fault')) : Effect.succeed(unit);
    });
  };

  // The provider foreign ids currently committed to the feed, sorted for stable assertions.
  const feedIds = async (db: Database.Database, feed: Feed.Feed): Promise<string[]> => {
    const items = await db.queryFeed(feed, Filter.everything()).run();
    return items
      .flatMap((item) =>
        Obj.getMeta(item)
          .keys.filter((key) => key.source === TEST_SOURCE)
          .map((key) => key.id),
      )
      .sort();
  };
});
