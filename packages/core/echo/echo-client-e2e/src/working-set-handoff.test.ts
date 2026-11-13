//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Order, Query } from '@dxos/echo';
import { type DatabaseImpl, EchoClient } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { makeInProcessClient } from '@dxos/protocols';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * One client writes and exports its working set; a second client of the same host seeds from it and must read those
 * writes through queries while the index does not hold them (EDGE's working set hands invocations off this way).
 */
describe('working set handoff', () => {
  let builder: EchoTestBuilder;
  let scope: Scope.Closeable;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    scope = Effect.runSync(Scope.make());
  });

  afterEach(async () => {
    await builder.close();
    await EffectEx.runPromise(Scope.close(scope, Exit.void));
  });

  test('a seeded client queries an object the index does not hold', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const writer = await peer.createDatabase();
    const indexed = writer.add(Obj.make(TestSchema.Task, { title: 'a' }));
    await writer.flush();
    const created = writer.add(Obj.make(TestSchema.Task, { title: 'z' }));
    await writer.flush({ disk: true, indexes: false });
    const rows = writer.exportWorkingSet({ maxBytes: MAX_BYTES });
    const unindexed = [...writer.unindexedWrites()];
    expect(unindexed).toContain(created.id);

    const hidden = new Set([created.id]);
    const { client, database: reader } = await openReader(scope, peer, writer, hidden);
    reader.seedWorkingSet(rows);
    await reader.open();
    reader.noteUnindexedWrites(unindexed);

    const all = await reader.query(Filter.type(TestSchema.Task)).run();
    expect(all.map((task) => task.id).sort()).toEqual([indexed.id, created.id].sort());

    // A flush waits for the index to take this client's writes, which says nothing about the writer's.
    await reader.flush();

    // A window is the index's to cut; only a write counted as unindexed enters it.
    const newest = await reader
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.property('title', 'desc')).limit(1))
      .run();
    expect(newest.map((task) => task.id)).toEqual([created.id]);

    // With no order, a write counted as unindexed enters a window only when the index answer is short of the limit.
    const page = await reader.query(Query.select(Filter.type(TestSchema.Task)).limit(10)).run();
    expect(page.map((task) => task.id).sort()).toEqual([indexed.id, created.id].sort());
    const full = await reader.query(Query.select(Filter.type(TestSchema.Task)).limit(1)).run();
    expect(full.map((task) => task.id)).toEqual([indexed.id]);
    await client.close();
  });

  test('a held copy overrules the index row of an object the writer changed', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const writer = await peer.createDatabase();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'original' }));
    await writer.flush();
    Obj.update(task, (task) => {
      task.title = 'changed';
    });
    await writer.flush({ disk: true, indexes: false });
    const rows = writer.exportWorkingSet({ maxBytes: MAX_BYTES });

    const { client, database: reader } = await openReader(scope, peer, writer, new Set());
    reader.seedWorkingSet(rows);
    await reader.open();
    reader.noteUnindexedWrites(writer.unindexedWrites());

    // Whether or not the index has caught up, the held copy decides both.
    expect(await reader.query(Filter.type(TestSchema.Task, { title: 'original' })).run()).toEqual([]);
    const changed = await reader.query(Filter.type(TestSchema.Task, { title: 'changed' })).run();
    expect(changed.map((entry) => entry.id)).toEqual([task.id]);
    await client.close();
  });
});

/** A second client of the peer's host, whose index answers leave out the `hidden` objects. */
const openReader = async (
  scope: Scope.Scope,
  peer: EchoTestPeer,
  db: DatabaseImpl,
  hidden: ReadonlySet<string>,
): Promise<{ client: EchoClient; database: DatabaseImpl }> => {
  const host = peer.host.queryService;
  const staleIndex: QueryService.Handlers = {
    'QueryService.setConfig': (request) => host['QueryService.setConfig'](request),
    'QueryService.reindex': () => host['QueryService.reindex'](),
    'QueryService.execQuery': (request) =>
      host['QueryService.execQuery'](request).pipe(
        Stream.map((response) => ({
          ...response,
          results: response.results?.filter((result) => !hidden.has(result.id)),
        })),
      ),
  };
  const [dataService, queryService, feedService] = await EffectEx.runPromise(
    Effect.all([
      makeInProcessClient(DataService.Rpcs, peer.host.dataService),
      makeInProcessClient(QueryService.Rpcs, staleIndex),
      makeInProcessClient(FeedService.Rpcs, peer.host.feedService),
    ]).pipe(Scope.provide(scope)),
  );
  const client = new EchoClient();
  await client.graph.registry.add([TestSchema.Task]);
  client.connectToService({ dataService, queryService, feedService });
  await client.open();
  const rootUrl = db.rootUrl;
  invariant(rootUrl, 'database has no space root');
  const database = client.constructDatabase({ spaceId: db.spaceId, spaceKey: db.spaceKey });
  await database.setSpaceRoot(rootUrl);
  return { client, database };
};
