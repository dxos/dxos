//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';

import { bindConnectionToTarget } from './auto-bind';
import { findBindingForTarget, findLiveBinding, removeOrphanedBindings } from './find-binding';

/**
 * Deleting a `Connection` leaves behind the cursors that referenced its access token, and a target
 * holding such an orphan can neither sync (no credentials) nor offer Connect if the orphan counts as
 * a binding — the mailbox that lost its Gmail connection ended up with no button at all. These cover
 * the one predicate both actions now key on.
 */
describe('live bindings', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      Connection.Connection,
      AccessToken.AccessToken,
      Cursor.Cursor,
      Trigger.Trigger,
      Expando.Expando,
    ]);

    const addConnection = (connectorId: string) => {
      const token = db.add(Obj.make(AccessToken.AccessToken, { source: `${connectorId}.example`, token: 'tok' }));
      return db.add(Obj.make(Connection.Connection, { connectorId, accessToken: Ref.make(token) }));
    };

    const bind = (connection: Connection.Connection, target: Obj.Unknown) => {
      const cursor = db.add(Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(target) }));
      invariant(Cursor.isExternal(cursor));
      return cursor;
    };

    const query = async () => ({
      cursors: await db.query(Filter.type(Cursor.Cursor)).run(),
      connections: await db.query(Filter.type(Connection.Connection)).run(),
    });

    return { db, addConnection, bind, query };
  };

  test('pairs a cursor with the connection authenticating it', async ({ expect }) => {
    const { db, addConnection, bind, query } = await setup();
    const connection = addConnection('gmail');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = bind(connection, target);
    await db.flush({ indexes: true });

    const { cursors, connections } = await query();
    expect(findLiveBinding(cursors, connections, target)).toEqual({ cursor, connection });
  });

  test('reads a target whose connection was deleted as unbound', async ({ expect }) => {
    const { db, addConnection, bind, query } = await setup();
    const connection = addConnection('gmail');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    bind(connection, target);
    await db.flush({ indexes: true });

    db.remove(connection);
    await db.flush({ indexes: true });

    const { cursors, connections } = await query();
    expect(cursors).toHaveLength(1);
    expect(findLiveBinding(cursors, connections, target)).toBeUndefined();
    // The Effect form (what `syncTarget` and the send-mail path resolve through) agrees.
    await expect(run(db, findBindingForTarget(target))).resolves.toBeUndefined();
  });

  test('skips an orphaned cursor in favour of a live one on the same target', async ({ expect }) => {
    const { db, addConnection, bind, query } = await setup();
    const stale = addConnection('gmail');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    bind(stale, target);
    await db.flush({ indexes: true });
    db.remove(stale);

    const connection = addConnection('gmail');
    const cursor = bind(connection, target);
    await db.flush({ indexes: true });

    const { cursors, connections } = await query();
    expect(findLiveBinding(cursors, connections, target)).toEqual({ cursor, connection });
  });

  test('removeOrphanedBindings drops only the cursors with no connection', async ({ expect }) => {
    const { db, addConnection, bind } = await setup();
    const stale = addConnection('gmail');
    const live = addConnection('gmail');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const other = db.add(Obj.make(Expando.Expando, { name: 'Other' }));
    bind(stale, target);
    const liveCursor = bind(live, target);
    const otherOrphan = bind(stale, other);
    await db.flush({ indexes: true });
    db.remove(stale);
    await db.flush({ indexes: true });

    await expect(run(db, removeOrphanedBindings(target))).resolves.toBe(1);
    await db.flush({ indexes: true });

    const cursors = await db.query(Filter.type(Cursor.Cursor)).run();
    // Another target's orphan is left alone — only the object being re-bound is cleaned up.
    expect(cursors.map((cursor) => cursor.id).sort()).toEqual([liveCursor.id, otherOrphan.id].sort());
  });

  test('re-binding a target removes the binding its deleted connection left behind', async ({ expect }) => {
    const { db, addConnection, bind } = await setup();
    const stale = addConnection('gmail');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    bind(stale, target);
    await db.flush({ indexes: true });
    db.remove(stale);
    await db.flush({ indexes: true });

    const connection = addConnection('gmail');
    await db.flush({ indexes: true });
    const cursor = await run(
      db,
      bindConnectionToTarget({ connection, connector: undefined, target: Ref.make(target) }),
    );
    await db.flush({ indexes: true });

    const cursors = await db.query(Filter.type(Cursor.Cursor)).run();
    expect(cursors.map((cursor) => cursor.id)).toEqual([cursor.id]);
  });

  const run = <A>(db: Database.Database, effect: Effect.Effect<A, never, Database.Service>): Promise<A> =>
    effect.pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
});
