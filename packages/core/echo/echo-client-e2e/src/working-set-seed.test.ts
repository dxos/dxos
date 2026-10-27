//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type DatabaseImpl, EchoClient } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { deferHandlers, makeInProcessClient } from '@dxos/protocols';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';

/**
 * A database seeded with the rows another session exported must open, show and take writes while its
 * host answers nothing, and hand those writes to the host once it does.
 */
describe('working set seed', () => {
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

  test('a seeded database opens, shows and edits objects before the host answers', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();
    const tasks = Array.from({ length: 3 }, (_, index) =>
      db.add(Obj.make(TestSchema.Task, { title: `task-${index}` })),
    );
    await db.flush();

    const rows = db.exportWorkingSet({ maxBytes: 10 * 1024 * 1024 });
    expect(rows[0].documentId).toBe(db.rootUrl?.replace('automerge:', ''));
    const objectRows = rows.filter((row) => row.objectId !== undefined);
    expect(objectRows.map((row) => row.objectId).sort()).toEqual(tasks.map((task) => task.id).sort());
    expect(objectRows.every((row) => row.objectJson !== undefined && row.bytes.length > 0)).toBe(true);

    const host = Promise.withResolvers<void>();
    const { client, database: seeded } = await openWithHeldHost(scope, peer, db, host.promise);
    seeded.seedWorkingSet(rows);
    await seeded.open();

    // Shown from the rows' JSON: nothing has come from the host.
    const shown = seeded.getObjectById<TestSchema.Task>(tasks[1].id);
    invariant(shown, 'seeded object not shown');
    expect(shown.title).toBe('task-1');

    // Written against the seeded bytes, held until the host is reachable.
    Obj.update(shown, (shown) => {
      shown.title = 'edited before the host answered';
    });
    expect(seeded.getObjectById<TestSchema.Task>(tasks[1].id)?.title).toBe('edited before the host answered');

    host.resolve();
    await seeded.flush();
    await expect
      .poll(() => db.getObjectById<TestSchema.Task>(tasks[1].id)?.title, { timeout: 5_000 })
      .toBe('edited before the host answered');
    await client.close();
  });

  test('the export keeps to its byte budget, space root first', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();
    Array.from({ length: 5 }, (_, index) => db.add(Obj.make(TestSchema.Task, { title: `task-${index}` })));
    await db.flush();

    const all = db.exportWorkingSet({ maxBytes: 10 * 1024 * 1024 });
    const [root] = all;
    const budget = root.bytes.length + all[1].bytes.length;
    const bounded = db.exportWorkingSet({ maxBytes: budget });
    expect(bounded[0].documentId).toBe(root.documentId);
    expect(bounded.reduce((total, row) => total + row.bytes.length, 0)).toBeLessThanOrEqual(budget);
    expect(bounded.length).toBeLessThan(all.length);
    expect(db.exportWorkingSet({ maxBytes: root.bytes.length - 1 })).toEqual([]);
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
