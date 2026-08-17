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

import { TargetAccountMismatchError } from '../errors';
import * as ConnectorSpec from '../types/ConnectorSpec';
import { bindConnectionToTarget } from './auto-bind';
import { suspendConnectionBindings } from './binding-lifecycle';
import { readTargetAccount } from './target-account';

const SOURCE = 'gmail.example';

const TestSync = Operation.make({
  meta: { key: DXN.make('org.dxos.test.bindingLifecycle.sync'), name: 'Test Sync' },
  input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
  output: Schema.Any,
});

/** A scheduled connector, so each binding gets a sync Routine whose trigger can be suspended. */
const connector: ConnectorSpec.ConnectorEntry = {
  id: 'gmail',
  source: SOURCE,
  sync: { operation: TestSync, trigger: Trigger.specTimer('*/10 * * * *') },
};

/**
 * A dormant binding — cursor kept, connection gone — is the state a disconnect leaves behind. Whether
 * its progress may be resumed is decided by the account recorded on the *target*, since that says whose
 * data the target's feed already holds; the credential that would have said so is deleted with its
 * connection.
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

    const addConnection = (account?: string) => {
      const token = db.add(Obj.make(AccessToken.AccessToken, { source: SOURCE, token: 'tok', account }));
      const connection = db.add(
        Obj.make(Connection.Connection, { connectorId: 'gmail', accessToken: Ref.make(token) }),
      );
      // Mirrors the coordinator: the token is owned by its connection, so deleting one deletes both.
      Obj.setParent(token, connection);
      return connection;
    };

    const run = <A, E>(effect: Effect.Effect<A, E, Database.Service>): Promise<A> =>
      effect.pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);

    const bind = (connection: Connection.Connection, target: Obj.Unknown) =>
      run(bindConnectionToTarget({ connection, connector, target: Ref.make(target) }));

    /** A target synced by `account` that has made progress, then had its connection deleted. */
    const dormantBinding = async (account: string) => {
      const connection = addConnection(account);
      const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
      await db.flush({ indexes: true });
      const cursor = await bind(connection, target);
      Cursor.advance(cursor, '1700000000000');
      await db.flush({ indexes: true });

      await run(suspendConnectionBindings(connection));
      db.remove(connection);
      await db.flush({ indexes: true });
      return { target, cursor };
    };

    const triggers = () => db.query(Filter.type(Trigger.Trigger)).run();
    const cursors = () => db.query(Filter.type(Cursor.Cursor)).run();

    return { db, addConnection, run, bind, dormantBinding, triggers, cursors };
  };

  test('binding records the account on the target', async ({ expect }) => {
    const { db, addConnection, bind } = await setup();
    const connection = addConnection('me@example.com');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    await db.flush({ indexes: true });

    await bind(connection, target);

    expect(readTargetAccount(target, SOURCE)).toBe('me@example.com');
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
    const { db, addConnection, bind, dormantBinding, triggers, cursors } = await setup();
    const { target, cursor } = await dormantBinding('me@example.com');

    const connection = addConnection('me@example.com');
    await db.flush({ indexes: true });
    const rebound = await bind(connection, target);
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

  test('re-connecting a different account is refused, leaving the target untouched', async ({ expect }) => {
    const { db, addConnection, bind, dormantBinding, cursors } = await setup();
    const { target, cursor } = await dormantBinding('me@example.com');

    const connection = addConnection('someone-else@example.com');
    await db.flush({ indexes: true });

    // Binding would merge two accounts into one feed, so it fails instead of reconciling.
    await expect(bind(connection, target)).rejects.toThrow(TargetAccountMismatchError);
    await db.flush({ indexes: true });

    // Nothing written: the dormant binding survives and the recorded account is unchanged.
    expect((await cursors()).map((cursor) => cursor.id)).toEqual([cursor.id]);
    expect(readTargetAccount(target, SOURCE)).toBe('me@example.com');
  });

  test('a target with no recorded account binds but does not inherit progress', async ({ expect }) => {
    const { db, addConnection, bind, cursors } = await setup();
    // A binding made before targets recorded their account: no evidence of a match, so no resume.
    const stale = addConnection('me@example.com');
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const legacy = db.add(Cursor.makeExternal({ source: stale.accessToken, target: Ref.make(target) }));
    invariant(Cursor.isExternal(legacy));
    Cursor.advance(legacy, '1700000000000');
    await db.flush({ indexes: true });
    db.remove(stale);
    await db.flush({ indexes: true });

    const connection = addConnection('me@example.com');
    await db.flush({ indexes: true });
    const rebound = await bind(connection, target);
    await db.flush({ indexes: true });

    expect(rebound.id).not.toBe(legacy.id);
    expect(rebound.max).toBeUndefined();
    // Declining to inherit an unverifiable watermark is not licence to destroy it: this is every
    // mailbox bound before accounts were recorded, and deleting its range here would force the very
    // full re-walk the dormant-binding design exists to avoid.
    const remaining = (await cursors()).map((cursor) => cursor.id);
    expect(remaining).toContain(legacy.id);
    expect(remaining).toContain(rebound.id);
    expect((await cursors()).find((cursor) => cursor.id === legacy.id)?.max).toBe('1700000000000');
    // Recorded now, so the next disconnect/reconnect cycle can resume.
    expect(readTargetAccount(target, SOURCE)).toBe('me@example.com');
  });

  test('a credential that reports no account never resumes', async ({ expect }) => {
    const { db, addConnection, bind, cursors } = await setup();
    const { target } = await (async () => {
      const connection = addConnection('me@example.com');
      const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
      await db.flush({ indexes: true });
      const cursor = await bind(connection, target);
      Cursor.advance(cursor, '1700000000000');
      db.remove(connection);
      await db.flush({ indexes: true });
      return { target };
    })();

    const anonymous = addConnection(undefined);
    await db.flush({ indexes: true });
    const rebound = await bind(anonymous, target);
    await db.flush({ indexes: true });

    // Unknown is not a contradiction, so the bind succeeds — but nothing is inherited, and the
    // dormant cursor is left intact for a later bind that can confirm the account.
    expect(rebound.max).toBeUndefined();
    expect((await cursors()).map((cursor) => cursor.id)).toContain(rebound.id);
    expect((await cursors()).length).toBe(2);
  });
});
