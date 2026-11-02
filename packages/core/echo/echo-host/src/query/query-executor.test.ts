//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import { describe, onTestFinished, test } from 'vitest';

import { Filter, Order, Query } from '@dxos/echo';
import { EchoFeedCodec, KEY_FEED_BRANCH, type QueryAST } from '@dxos/echo-protocol';
import { ATTR_DELETED, ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { FeedStore } from '@dxos/feed';
import { EntityMetaIndex, IndexEngine, type IndexerObject, ObjectSnapshotIndex } from '@dxos/index-core';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { QueryReactivity } from '@dxos/protocols/buf/dxos/echo/query_pb';

import { AutomergeHost } from '../automerge/index.ts';
import { SpaceStateManager } from '../db-host/space-state-manager.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { QueryExecutor } from './query-executor.ts';

describe('QueryExecutor', () => {
  test('a skip(k).limit(n) feed read loads only the n documents it returns', async ({ expect }) => {
    const { runtime, indexEngine, feedUri, objectIds } = await setupFeed(8);
    const executor = new QueryExecutor({
      indexEngine,
      runtime,
      automergeHost: new AutomergeHost({ runtime }),
      spaceStateManager: new SpaceStateManager({ runtime }),
      queryId: 'test',
      query: Query.select(Filter.everything())
        .orderBy(Order.natural('desc'))
        .skip(3)
        .limit(2)
        .from([{ _tag: 'feed', feedUri }]).ast,
      reactivity: QueryReactivity.ONE_SHOT,
      executor: 'memory',
    });
    await executor.open();
    onTestFinished(async () => {
      await executor.close();
    });

    await executor.execQuery();

    expect((await executor.getResults()).map((result) => result.id)).toEqual([objectIds[4], objectIds[3]]);
    const select = executor.trace.children.find((child) => child.name === 'Select');
    expect(select?.documentsLoaded).toBe(2);
  });

  // Main rows sort first, so a limit applied before the branch filter would return none of the branch.
  for (const mode of ['memory', 'sql'] as const) {
    test(`a branch-scoped feed read applies its limit after the branch filter (${mode})`, async ({ expect }) => {
      const branch = EntityId.random();
      const { runtime, indexEngine, feedUri, objectIds } = await setupFeed(6, (index) =>
        index < 3 ? undefined : branch,
      );
      const run = async (branches: QueryAST.FeedScope['branches'], limit: number) => {
        const executor = new QueryExecutor({
          indexEngine,
          runtime,
          automergeHost: new AutomergeHost({ runtime }),
          spaceStateManager: new SpaceStateManager({ runtime }),
          queryId: 'test',
          query: Query.select(Filter.everything())
            .orderBy(Order.natural('asc'))
            .limit(limit)
            .from([{ _tag: 'feed', feedUri, branches }]).ast,
          reactivity: QueryReactivity.ONE_SHOT,
          executor: mode,
          sql: await RuntimeProvider.runPromise(runtime)(SqlClient.SqlClient),
        });
        await executor.open();
        onTestFinished(async () => {
          await executor.close();
        });
        await executor.execQuery();
        return (await executor.getResults()).map((result) => result.id);
      };

      expect(await run([branch], 2)).toEqual(objectIds.slice(3, 5));
      expect(await run([null], 10)).toEqual(objectIds.slice(0, 3));
      // An unfiltered feed read is a default read, so it covers only the main branch.
      expect(await run(undefined, 10)).toEqual(objectIds.slice(0, 3));
      expect(await run('all', 10)).toEqual(objectIds);
    });
  }

  test('a branch of a feed whose index holds only main is read from the feed store', async ({ expect }) => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const spaceId = SpaceId.random();
    const feedId = EntityId.random();
    const { indexEngine, feedStore, branch } = await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const indexEngine = new IndexEngine(sql);
        yield* indexEngine.migrate();
        const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: false });
        yield* feedStore.migrate();
        const append = (name: string, intent: { forkAt: string } | { branch?: string } = {}) =>
          feedStore
            .appendLocal([
              {
                spaceId,
                feedId,
                feedNamespace: FeedProtocol.WellKnownNamespaces.data,
                data: EchoFeedCodec.encode({
                  id: EntityId.random(),
                  [ATTR_TYPE]: DXN.make('com.example.type.item', '0.1.0'),
                  name,
                }),
                ...intent,
              },
            ])
            .pipe(Effect.map(([block]) => EchoFeedCodec.blockId(block.actorId, block.sequence)));
        const main1 = yield* append('main-1');
        const branch = yield* append('branch-1', { forkAt: main1 });
        yield* append('main-2');
        yield* append('branch-2', { branch });
        return { indexEngine, feedStore, branch };
      }),
    );
    const executor = new QueryExecutor({
      indexEngine,
      runtime,
      automergeHost: new AutomergeHost({ runtime }),
      spaceStateManager: new SpaceStateManager({ runtime }),
      queryId: 'test',
      query: Query.select(Filter.everything()).from([
        { _tag: 'feed', feedUri: EID.make({ spaceId, entityId: feedId }), branches: [branch] },
      ]).ast,
      reactivity: QueryReactivity.ONE_SHOT,
      executor: 'memory',
      feedStore,
    });
    await executor.open();
    onTestFinished(async () => {
      await executor.close();
    });
    await executor.execQuery();

    // Nothing was indexed, so every item came from the store, and only the branch's.
    const results = await executor.getResults();
    expect(results.map((result) => nameOf(result.documentJson)).sort()).toEqual(['branch-1', 'branch-2']);
  });
});

/** The `name` property of a result's serialized document. */
const nameOf = (documentJson: string | undefined): unknown => {
  const value: unknown = documentJson === undefined ? undefined : JSON.parse(documentJson);
  return typeof value === 'object' && value !== null && 'name' in value ? value.name : undefined;
};

/**
 * Indexes `count` blocks of one feed, returning their ids in natural (ascending) order; `branchOf`
 * places the block at each index on a branch.
 */
const setupFeed = async (count: number, branchOf: (index: number) => string | undefined = () => undefined) => {
  const { runtime, dispose } = createTestSqliteRuntime();
  onTestFinished(() => dispose());
  const spaceId = SpaceId.random();
  const queueId = EntityId.random();
  const objectIds = Array.from({ length: count }, () => EntityId.random()).sort();
  const indexEngine = await RuntimeProvider.runPromise(runtime)(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const indexEngine = new IndexEngine(sql);
      yield* indexEngine.migrate();
      const objects = objectIds.map((id, index): IndexerObject => {
        const branch = branchOf(index);
        return {
          spaceId,
          queueId,
          queueNamespace: 'data',
          documentId: null,
          recordId: null,
          queuePosition: null,
          createdAt: null,
          updatedAt: 1,
          data: {
            id,
            [ATTR_TYPE]: DXN.make('com.example.type.item', '0.1.0'),
            [ATTR_DELETED]: false,
            ...(branch !== undefined ? { [ATTR_META]: { keys: [{ source: KEY_FEED_BRANCH, id: branch }] } } : {}),
          },
        };
      });
      const meta = new EntityMetaIndex(sql);
      yield* meta.update(objects);
      yield* meta.lookupRecordIds(objects);
      yield* new ObjectSnapshotIndex(sql).update(objects);
      return indexEngine;
    }),
  );
  return { runtime, indexEngine, feedUri: EID.make({ spaceId, entityId: queueId }), objectIds };
};
