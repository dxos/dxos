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

import { findBindingForTarget, findLiveBinding, findOrphanedBindings } from './find-binding';

/**
 * Deleting a `Connection` cascade-deletes the access token it owns but leaves the cursors that
 * referenced it, and a target holding such a dormant binding can neither sync (no credential) nor offer
 * Connect if the binding counts as connected — the mailbox that lost its Gmail connection ended up with
 * no button at all. These cover the one predicate both actions now key on.
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

    const addConnection = (connectorId: string, account?: string) => {
      const token = db.add(
        Obj.make(AccessToken.AccessToken, { source: `${connectorId}.example`, token: 'tok', account }),
      );
      return db.add(Obj.make(Connection.Connection, { connectorId, accessToken: Ref.make(token) }));
    };

    const bind = (connection: Connection.Connection, target: Obj.Unknown, account?: string) => {
      const cursor = db.add(Cursor.makeExternal({ source: connection.accessToken, account, target: Ref.make(target) }));
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
    expect(findOrphanedBindings(cursors, connections, target)).toEqual([]);
  });

  test('reads a target whose connection was deleted as unbound', async ({ expect }) => {
    const { db, addConnection, bind, query } = await setup();
    const connection = addConnection('gmail');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = bind(connection, target);
    await db.flush({ indexes: true });

    db.remove(connection);
    await db.flush({ indexes: true });

    const { cursors, connections } = await query();
    expect(findLiveBinding(cursors, connections, target)).toBeUndefined();
    // The cursor survives the connection as a dormant binding, and is reported as one.
    expect(findOrphanedBindings(cursors, connections, target)).toEqual([cursor]);
    // The Effect form (what `syncTarget` and the send-mail path resolve through) agrees.
    await expect(
      findBindingForTarget(target).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise),
    ).resolves.toBeUndefined();
  });

  test('prefers a live binding over a dormant one on the same target', async ({ expect }) => {
    const { db, addConnection, bind, query } = await setup();
    const stale = addConnection('gmail');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const staleCursor = bind(stale, target);
    await db.flush({ indexes: true });
    db.remove(stale);

    const connection = addConnection('gmail');
    const cursor = bind(connection, target);
    await db.flush({ indexes: true });

    const { cursors, connections } = await query();
    expect(findLiveBinding(cursors, connections, target)).toEqual({ cursor, connection });
    expect(findOrphanedBindings(cursors, connections, target)).toEqual([staleCursor]);
  });

  test('scopes dormant bindings to the target asked about', async ({ expect }) => {
    const { db, addConnection, bind, query } = await setup();
    const stale = addConnection('gmail');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const other = db.add(Obj.make(Expando.Expando, { name: 'Other' }));
    const cursor = bind(stale, target);
    bind(stale, other);
    await db.flush({ indexes: true });
    db.remove(stale);
    await db.flush({ indexes: true });

    const { cursors, connections } = await query();
    expect(findOrphanedBindings(cursors, connections, target)).toEqual([cursor]);
  });
});
