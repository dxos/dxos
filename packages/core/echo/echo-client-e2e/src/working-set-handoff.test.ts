//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import { describe, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Filter, Obj, Order, Query } from '@dxos/echo';
import { type DatabaseImpl, EchoClient } from '@dxos/echo-client';
import { EchoTestBuilder, hidingQueryService, makeTestWorkingSet } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { type WorkingSetService, makeInProcessClient } from '@dxos/protocols';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * One client writes and exports its working set; a second client of the same host seeds from it and must read those
 * writes through queries while the index does not hold them (EDGE's working set hands invocations off this way).
 */
describe('working set handoff', () => {
  test('a seeded client queries an object the index does not hold', async ({ expect }) => {
    const { peer, openReader } = await setup();
    const writer = await peer.createDatabase();
    const indexed = writer.add(Obj.make(TestSchema.Task, { title: 'a' }));
    await writer.flush();
    const created = writer.add(Obj.make(TestSchema.Task, { title: 'z' }));
    await writer.flush({ disk: true, indexes: false });
    const rows = writer.exportWorkingSet({ maxBytes: MAX_BYTES });
    expect(rows.some((row) => row.objectId === created.id)).toBe(true);

    const workingSet = makeTestWorkingSet(rows);
    const reader = await openReader(writer, new Set([created.id]), workingSet.service);

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
  });

  test('a held copy overrules the index row of an object the writer changed', async ({ expect }) => {
    const { peer, openReader } = await setup();
    const writer = await peer.createDatabase();
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'original' }));
    await writer.flush();
    Obj.update(task, (task) => {
      task.title = 'changed';
    });
    await writer.flush({ disk: true, indexes: false });
    const workingSet = makeTestWorkingSet(writer.exportWorkingSet({ maxBytes: MAX_BYTES }));

    const reader = await openReader(writer, new Set(), workingSet.service);

    // Whether or not the index has caught up, the held copy decides both.
    expect(await reader.query(Filter.type(TestSchema.Task, { title: 'original' })).run()).toEqual([]);
    const changed = await reader.query(Filter.type(TestSchema.Task, { title: 'changed' })).run();
    expect(changed.map((entry) => entry.id)).toEqual([task.id]);
  });

  test('a database takes the writes another one made after it opened', async ({ expect }) => {
    const { peer, openReader } = await setup();
    const space = await peer.createDatabase();
    const workingSet = makeTestWorkingSet();
    // The waiting database's index answers leave the task out, as an index that has not caught up would.
    const hidden = new Set<string>();
    const waiting = await openReader(space, hidden, workingSet.service);

    const writer = await openReader(space, new Set(), workingSet.service);
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'later' }));
    await writer.flush({ indexes: false });
    hidden.add(task.id);

    // The test host pushes the space root's change, which routes the task's id; EDGE re-reads it instead.
    await waiting.loadObjectCoreById(task.id);
    const window = Query.select(Filter.type(TestSchema.Task)).limit(10);
    expect(await waiting.query(window).run()).toEqual([]);
    // A subscriber learns of the absorbed task too, not only a fresh run.
    const notified = new Trigger();
    const unsubscribe = waiting.query(window).subscribe((query) => {
      if (query.results.some((entry) => entry.id === task.id)) {
        notified.wake();
      }
    });
    onTestFinished(unsubscribe);
    await waiting.absorbWorkingSet();
    expect((await waiting.query(window).run()).map((entry) => entry.id)).toEqual([task.id]);
    await notified.wait();
  });
});

/** A host with one peer, and readers of its spaces on clients of their own; everything closes when the test ends. */
const setup = async () => {
  const builder = await new EchoTestBuilder().open();
  onTestFinished(async () => {
    await builder.close();
  });
  const scope = Effect.runSync(Scope.make());
  onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
  const peer = await builder.createPeer({ types: [TestSchema.Task] });

  /** An open database of `db`'s space on a second client, whose index answers leave out the `hidden` objects. */
  const openReader = async (
    db: DatabaseImpl,
    hidden: ReadonlySet<string>,
    workingSet?: WorkingSetService,
  ): Promise<DatabaseImpl> => {
    const [dataService, queryService, feedService] = await EffectEx.runPromise(
      Effect.all([
        makeInProcessClient(DataService.Rpcs, peer.host.dataService),
        makeInProcessClient(
          QueryService.Rpcs,
          hidingQueryService(peer.host.queryService, (id) => id !== undefined && hidden.has(id)),
        ),
        makeInProcessClient(FeedService.Rpcs, peer.host.feedService),
      ]).pipe(Scope.provide(scope)),
    );
    const client = new EchoClient();
    await client.graph.registry.add([TestSchema.Task]);
    client.connectToService({ dataService, queryService, feedService });
    await client.open();
    onTestFinished(async () => {
      await client.close();
    });
    const rootUrl = db.rootUrl;
    invariant(rootUrl, 'database has no space root');
    const database = client.constructDatabase({ spaceId: db.spaceId, spaceKey: db.spaceKey, workingSet });
    await database.setSpaceRoot(rootUrl);
    await database.open();
    return database;
  };

  return { peer, openReader };
};
