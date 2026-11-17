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
import {
  type WorkingSet,
  type WorkingSetReport,
  type WorkingSetRow,
  type WorkingSetService,
  makeInProcessClient,
} from '@dxos/protocols';
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
    expect(rows.some((row) => row.objectId === created.id)).toBe(true);

    const hidden = new Set([created.id]);
    const workingSet = makeWorkingSet({ rows });
    const { client, database: reader } = await openReader(scope, peer, writer, hidden, workingSet.service);
    await reader.open();

    const all = await reader.query(Filter.type(TestSchema.Task)).run();
    expect(all.map((task) => task.id).sort()).toEqual([indexed.id, created.id].sort());

    // A flush waits for the index to take this client's writes, which says nothing about the writer's.
    await reader.flush();

    // A window is the index's to cut; an object the working set holds enters it where its order puts it.
    const newest = await reader
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.property('title', 'desc')).limit(1))
      .run();
    expect(newest.map((task) => task.id)).toEqual([created.id]);

    // With no order, an object the working set holds enters a window only when the index answer is short of the limit.
    const page = await reader.query(Query.select(Filter.type(TestSchema.Task)).limit(10)).run();
    expect(page.map((task) => task.id).sort()).toEqual([indexed.id, created.id].sort());
    const full = await reader.query(Query.select(Filter.type(TestSchema.Task)).limit(1)).run();
    expect(full.map((task) => task.id)).toEqual([indexed.id]);

    // Only reading what it was seeded with, it sends no document back.
    expect(workingSet.puts.flatMap((put) => put.rows)).toEqual([]);
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
    const workingSet = makeWorkingSet({ rows: writer.exportWorkingSet({ maxBytes: MAX_BYTES }) });

    const { client, database: reader } = await openReader(scope, peer, writer, new Set(), workingSet.service);
    await reader.open();

    // Whether or not the index has caught up, the held copy decides both.
    expect(await reader.query(Filter.type(TestSchema.Task, { title: 'original' })).run()).toEqual([]);
    const changed = await reader.query(Filter.type(TestSchema.Task, { title: 'changed' })).run();
    expect(changed.map((entry) => entry.id)).toEqual([task.id]);
    await client.close();
  });
  test('a database sends a write to its working set once the host stores it, and a flush waits for it', async ({
    expect,
  }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const space = await peer.createDatabase();
    const workingSet = makeWorkingSet();
    const { client, database } = await openReader(scope, peer, space, new Set(), workingSet.service);
    await database.open();

    const task = database.add(Obj.make(TestSchema.Task, { title: 'a' }));
    await database.flush({ indexes: false });
    const rows = workingSet.puts.flatMap((put) => put.rows);
    expect(rows.some((row) => row.objectId === task.id)).toBe(true);
    // The space root links the new document, so its write is sent too, named as the root.
    expect(
      workingSet.puts.some((put) => put.root !== undefined && rows.some((row) => row.documentId === put.root)),
    ).toBe(true);
    await client.close();
  });

  test('a database takes the writes another one made after it opened', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const space = await peer.createDatabase();
    const workingSet = makeWorkingSet();
    // The waiting database's index answers leave the task out, as an index that has not caught up would.
    const hidden = new Set<string>();
    const waiting = await openReader(scope, peer, space, hidden, workingSet.service);
    await waiting.database.open();

    const writer = await openReader(scope, peer, space, new Set(), workingSet.service);
    await writer.database.open();
    const task = writer.database.add(Obj.make(TestSchema.Task, { title: 'later' }));
    await writer.database.flush({ indexes: false });
    hidden.add(task.id);
    await writer.client.close();

    // The test host pushes the space root's change, which routes the task's id; EDGE re-reads it instead.
    await expect.poll(() => waiting.database.getObjectById(task.id)).toBeDefined();
    const window = Query.select(Filter.type(TestSchema.Task)).limit(10);
    expect(await waiting.database.query(window).run()).toEqual([]);
    await waiting.database.absorbWorkingSet();
    expect((await waiting.database.query(window).run()).map((entry) => entry.id)).toEqual([task.id]);
    await waiting.client.close();
  });

  test('a failing working set leaves the database as it is without one', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const space = await peer.createDatabase();
    const failing: WorkingSetService = {
      get: () => Promise.reject(new Error('unavailable')),
      put: () => Promise.reject(new Error('unavailable')),
    };
    const { client, database } = await openReader(scope, peer, space, new Set(), failing);
    await database.open();
    const task = database.add(Obj.make(TestSchema.Task, { title: 'kept' }));
    await database.flush({ indexes: false });
    expect((await database.query(Filter.id(task.id)).run()).map((entry) => entry.id)).toEqual([task.id]);
    await client.close();
  });
});

/** A working set kept in memory, as an EDGE owner keeps it in its storage: one row per document. */
const makeWorkingSet = (initial: WorkingSet = { rows: [] }) => {
  const rows = new Map<string, WorkingSetRow>(initial.rows.map((row) => [row.documentId, row]));
  const puts: WorkingSetReport[] = [];
  const service: WorkingSetService = {
    get: async () => ({ rows: [...rows.values()] }),
    put: async (report) => {
      puts.push(report);
      report.rows.forEach((row) => rows.set(row.documentId, row));
    },
  };
  return { service, puts };
};

/** A second client of the peer's host, whose index answers leave out the `hidden` objects, over `workingSet` if given. */
const openReader = async (
  scope: Scope.Scope,
  peer: EchoTestPeer,
  db: DatabaseImpl,
  hidden: ReadonlySet<string>,
  workingSet?: WorkingSetService,
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
  const database = client.constructDatabase({ spaceId: db.spaceId, spaceKey: db.spaceKey, workingSet });
  await database.setSpaceRoot(rootUrl);
  return { client, database };
};
