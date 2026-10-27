//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import { describe, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { Aggregate, Filter, Order, Query } from '@dxos/echo';
import { type DatabaseDirectory, EntityStructure, type QueryAST, SpaceDocVersion } from '@dxos/echo-protocol';
import { ATTR_DELETED, ATTR_TYPE } from '@dxos/echo/internal';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { EntityMetaIndex, IndexEngine, type IndexerObject, ObjectSnapshotIndex } from '@dxos/index-core';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';
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

  test('shows the objects of a document the index has never read, under the compiled executor too', async ({
    expect,
  }) => {
    const { spaceId, documentId, objectId, makeExecutor } = await setupUnindexedDocument();
    const unread = new Map([[spaceId, [documentId]]]);
    const typed = Query.select(Filter.type(TEST_TYPE)).from([{ _tag: 'space', spaceId }]).ast;
    const counted = Query.select(Filter.type(TEST_TYPE))
      .from([{ _tag: 'space', spaceId }])
      .aggregate({ total: Aggregate.count() }).ast;

    const blind = await makeExecutor(typed, new Map());
    await blind.execQuery();
    expect(await blind.getResults()).toEqual([]);

    const typedExecutor = await makeExecutor(typed, unread);
    await typedExecutor.execQuery();
    expect((await typedExecutor.getResults()).map((result) => result.id)).toEqual([objectId]);

    const everything = await makeExecutor(
      Query.select(Filter.everything()).from([{ _tag: 'space', spaceId }]).ast,
      unread,
    );
    await everything.execQuery();
    expect((await everything.getResults()).map((result) => result.id)).toEqual([objectId]);

    const countExecutor = await makeExecutor(counted, unread);
    await countExecutor.execQuery();
    const [group] = await countExecutor.getResults();
    expect(JSON.parse(group.aggregates ?? '{}')).toEqual({ total: 1 });
  });
});

const TEST_TYPE = DXN.make('com.example.type.test', '0.1.0');

/** A saved document with one object over an empty index, and executors for queries over its space. */
const setupUnindexedDocument = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  onTestFinished(() => dispose());
  const automergeHost = new AutomergeHost({ runtime });
  await automergeHost.open();
  onTestFinished(async () => {
    await automergeHost.close();
  });
  const { indexEngine, sql } = await RuntimeProvider.runPromise(runtime)(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const indexEngine = new IndexEngine(sql);
      yield* indexEngine.migrate();
      return { indexEngine, sql };
    }),
  );

  const spaceId = SpaceId.random();
  const objectId = EntityId.random();
  using lease = await automergeHost.createDoc<DatabaseDirectory>({
    version: SpaceDocVersion.CURRENT,
    access: { spaceId },
    objects: { [objectId]: EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'unindexed' } }) },
    links: {},
  });
  await automergeHost.flush(Context.default());

  const makeExecutor = async (query: QueryAST.Query, unread: ReadonlyMap<SpaceId, readonly DocumentId[]>) => {
    const executor = new QueryExecutor({
      indexEngine,
      runtime,
      automergeHost,
      spaceStateManager: new SpaceStateManager({ runtime }),
      queryId: 'test',
      query,
      reactivity: QueryReactivity.ONE_SHOT,
      executor: 'sql',
      sql,
      unreadDocuments: () => unread,
    });
    await executor.open();
    onTestFinished(async () => {
      await executor.close();
    });
    return executor;
  };

  return { spaceId, documentId: lease.documentId, objectId, makeExecutor };
};

/** Indexes `count` blocks of one feed, returning their ids in natural (ascending) order. */
const setupFeed = async (count: number) => {
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
      const objects = objectIds.map((id): IndexerObject => ({
        spaceId,
        queueId,
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        queuePosition: null,
        createdAt: null,
        updatedAt: 1,
        data: { id, [ATTR_TYPE]: DXN.make('com.example.type.item', '0.1.0'), [ATTR_DELETED]: false },
      }));
      const meta = new EntityMetaIndex(sql);
      yield* meta.update(objects);
      yield* meta.lookupRecordIds(objects);
      yield* new ObjectSnapshotIndex(sql).update(objects);
      return indexEngine;
    }),
  );
  return { runtime, indexEngine, feedUri: EID.make({ spaceId, entityId: queueId }), objectIds };
};
