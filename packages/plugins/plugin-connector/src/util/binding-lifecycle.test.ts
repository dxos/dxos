//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, DXN, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';

import * as ConnectorSpec from '../types/ConnectorSpec';
import { bindConnectionToTarget } from './auto-bind';
import { adoptOrphanedBinding, suspendConnectionBindings } from './binding-lifecycle';

const TestSync = Operation.make({
  meta: { key: DXN.make('org.dxos.test.bindingLifecycle.sync'), name: 'Test Sync' },
  input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
  output: Schema.Any,
});

/** A scheduled connector, so each binding gets a sync Routine whose trigger can be suspended. */
const connector: ConnectorSpec.ConnectorEntry = {
  id: 'gmail',
  source: 'gmail.example',
  sync: { operation: TestSync, trigger: Trigger.specTimer('*/10 * * * *') },
};

/**
 * A dormant binding — cursor kept, connection gone — is the state a disconnect leaves behind. Its
 * progress describes the remote account, so re-connecting the same account resumes it rather than
 * re-walking the horizon (which, past the feed's seeded boundary windows, would re-append messages).
 */
describe('binding lifecycle', () => {
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
      Routine.Routine,
      Expando.Expando,
    ]);

    const addConnection = (account: string) => {
      const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'gmail.example', token: 'tok', account }));
      const connection = db.add(
        Obj.make(Connection.Connection, { connectorId: 'gmail', accessToken: Ref.make(token) }),
      );
      Obj.setParent(token, connection);
      return connection;
    };

    const run = <A>(effect: Effect.Effect<A, never, Database.Service>): Promise<A> =>
      effect.pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);

    /** A target synced by `account` that has made progress, then had its connection deleted. */
    const dormantBinding = async (account: string) => {
      const connection = addConnection(account);
      const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
      await db.flush({ indexes: true });
      const cursor = await run(bindConnectionToTarget({ connection, connector, target: Ref.make(target) }));
      Cursor.advance(cursor, '1700000000000');
      await db.flush({ indexes: true });

      await run(suspendConnectionBindings(connection));
      db.remove(connection);
      await db.flush({ indexes: true });
      return { target, cursor };
    };

    const triggers = () => db.query(Filter.type(Trigger.Trigger)).run();
    const cursors = () => db.query(Filter.type(Cursor.Cursor)).run();

    return { db, addConnection, run, dormantBinding, triggers, cursors };
  };

  test('a new binding records the account it was authorized for', async ({ expect }) => {
    const { db, addConnection, run } = await setup();
    const connection = addConnection('me@example.com');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    await db.flush({ indexes: true });

    const cursor = await run(bindConnectionToTarget({ connection, connector, target: Ref.make(target) }));

    expect(cursor.spec.account).toBe('me@example.com');
  });

  test('deleting a connection suspends its bindings without discarding them', async ({ expect }) => {
    const { dormantBinding, triggers, cursors } = await setup();

    const { cursor } = await dormantBinding('me@example.com');

    expect((await cursors()).map((cursor) => cursor.id)).toEqual([cursor.id]);
    expect(cursor.max).toBe('1700000000000');
    // The schedule stops firing; without a credential every run would fail.
    expect((await triggers()).map((trigger) => trigger.enabled)).toEqual([false]);
  });

  test('re-connecting the same account resumes the dormant binding', async ({ expect }) => {
    const { db, addConnection, run, dormantBinding, triggers, cursors } = await setup();
    const { target, cursor } = await dormantBinding('me@example.com');

    const connection = addConnection('me@example.com');
    await db.flush({ indexes: true });
    const rebound = await run(bindConnectionToTarget({ connection, connector, target: Ref.make(target) }));
    await db.flush({ indexes: true });

    // Same cursor, same high-water mark: the next sync resumes instead of re-walking the horizon.
    expect(rebound.id).toBe(cursor.id);
    expect(rebound.max).toBe('1700000000000');
    expect(rebound.spec.source.uri).toBe(connection.accessToken.uri);
    expect((await cursors()).map((cursor) => cursor.id)).toEqual([cursor.id]);
    // The suspended schedule is restored rather than duplicated.
    const restored = await triggers();
    expect(restored.map((trigger) => trigger.enabled)).toEqual([true]);
    expect(restored[0].input?.binding?.uri).toBe(Ref.make(cursor).uri);
  });

  test('re-connecting a different account starts fresh, dropping the dormant binding', async ({ expect }) => {
    const { db, addConnection, run, dormantBinding, cursors } = await setup();
    const { target, cursor } = await dormantBinding('me@example.com');

    const connection = addConnection('someone-else@example.com');
    await db.flush({ indexes: true });
    const rebound = await run(bindConnectionToTarget({ connection, connector, target: Ref.make(target) }));
    await db.flush({ indexes: true });

    // Another account's watermark would silently skip its mail, so nothing is carried over.
    expect(rebound.id).not.toBe(cursor.id);
    expect(rebound.max).toBeUndefined();
    expect(rebound.spec.account).toBe('someone-else@example.com');
    expect((await cursors()).map((cursor) => cursor.id)).toEqual([rebound.id]);
  });

  test('a binding with no recorded account is not resumed', async ({ expect }) => {
    const { db, addConnection, run, cursors } = await setup();
    // A cursor written before `spec.account` existed: an absent account is not evidence of a match.
    const stale = addConnection('me@example.com');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const legacy = db.add(Cursor.makeExternal({ source: stale.accessToken, target: Ref.make(target) }));
    invariant(Cursor.isExternal(legacy));
    await db.flush({ indexes: true });
    db.remove(stale);
    await db.flush({ indexes: true });

    const connection = addConnection('me@example.com');
    await db.flush({ indexes: true });
    const adopted = await run(
      adoptOrphanedBinding({
        target,
        source: connection.accessToken,
        account: 'me@example.com',
        connector,
      }),
    );
    await db.flush({ indexes: true });

    expect(adopted).toBeUndefined();
    expect(await cursors()).toEqual([]);
  });
});
