//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Query } from '@dxos/echo';
import { type DatabaseImpl, EchoClient } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { deferHandlers, makeInProcessClient } from '@dxos/protocols';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';

/**
 * A space root that holds only links is read from JSON — the boot cache's or the host's — and its Automerge
 * document loads only when the client writes to it.
 */
describe('space root JSON', () => {
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

  test('a seeded database routes and shows objects without loading its root', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();
    const tasks = Array.from({ length: 3 }, (_, index) =>
      db.add(Obj.make(TestSchema.Task, { title: `task-${index}` })),
    );
    await db.flush();

    const rows = db.exportWorkingSet({ maxBytes: 10 * 1024 * 1024 });
    expect(rows[0].directoryJson).toBeDefined();

    const host = Promise.withResolvers<void>();
    const { client, database: seeded } = await openWithHeldHost(scope, peer, db, host.promise);
    seeded.seedWorkingSet(rows);
    await seeded.open();

    const root = seeded.getSpaceRootDocHandle();
    expect(root.state).toBe('passive');
    expect(seeded.getObjectDocumentId(tasks[2].id)).toBe(db.getObjectDocumentId(tasks[2].id));
    expect(seeded.getObjectById<TestSchema.Task>(tasks[2].id)?.title).toBe('task-2');
    expect(seeded.getAllObjectIds().sort()).toEqual(tasks.map((task) => task.id).sort());

    host.resolve();
    await seeded.flush();
    expect(root.state).toBe('passive');
    await client.close();
  });

  test('an unseeded database opens its root from the host JSON and loads it on the first write', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();
    const task = db.add(Obj.make(TestSchema.Task, { title: 'existing' }));
    await db.flush();

    const client = await peer.createClient();
    const reader = await peer.openDatabase(db.spaceKey, db.rootUrl, { client });
    const root = reader.getSpaceRootDocHandle();
    expect(root.state).toBe('passive');
    const loaded = await reader.query(Query.type(TestSchema.Task, { id: task.id })).first();
    expect(loaded.title).toBe('existing');
    expect(root.state).toBe('passive');

    // A new object links its document from the root, which is the root's first write.
    const added = reader.add(Obj.make(TestSchema.Task, { title: 'added by the reader' }));
    await reader.flush();
    expect(root.state).not.toBe('passive');
    await expect
      .poll(async () => (await db.query(Query.type(TestSchema.Task, { id: added.id })).run())[0]?.title, {
        timeout: 5_000,
      })
      .toBe('added by the reader');
  });

  test('a host update to a passive root routes the new object without loading the root', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();
    db.add(Obj.make(TestSchema.Task, { title: 'first' }));
    await db.flush();

    const client = await peer.createClient();
    const reader = await peer.openDatabase(db.spaceKey, db.rootUrl, { client });
    const root = reader.getSpaceRootDocHandle();
    expect(root.state).toBe('passive');

    const added = db.add(Obj.make(TestSchema.Task, { title: 'added by the writer' }));
    await db.flush();
    await expect
      .poll(() => reader.getObjectDocumentId(added.id), { timeout: 5_000 })
      .toBe(db.getObjectDocumentId(added.id));
    const loaded = await reader.query(Query.type(TestSchema.Task, { id: added.id })).first();
    expect(loaded.title).toBe('added by the writer');
    expect(root.state).toBe('passive');
  });
});

/** A second client of the peer's host, whose every request waits for `reachable`. */
const openWithHeldHost = async (
  scope: Scope.Scope,
  peer: EchoTestPeer,
  db: DatabaseImpl,
  reachable: Promise<void>,
): Promise<{ client: EchoClient; database: DatabaseImpl }> => {
  const [dataService, queryService, feedService] = await EffectEx.runPromise(
    Effect.all([
      makeInProcessClient(DataService.Rpcs, deferHandlers(DataService.Rpcs, peer.host.dataService, reachable)),
      makeInProcessClient(QueryService.Rpcs, deferHandlers(QueryService.Rpcs, peer.host.queryService, reachable)),
      makeInProcessClient(FeedService.Rpcs, deferHandlers(FeedService.Rpcs, peer.host.feedService, reachable)),
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
