//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Trigger as AsyncTrigger } from '@dxos/async';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { operationServiceLayerNoop } from '@dxos/compute/testing';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, DXN, Filter, Obj, Ref, URI } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { OperationInvoker } from '@dxos/operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Expando } from '@dxos/schema';

import { ConnectorSpec } from '#types';

import * as Binding from './Binding.ts';
import { autoSyncConnection } from './capabilities/connector-coordinator/auto-sync.ts';
import { ConnectionAuthExpiredError, TargetAccountMismatchError } from './errors.ts';
/**
 * The binding namespace: pairing an object with the feed a connection syncs into it, the account that
 * gates a resume, the schedule that drives it, and what a disconnect leaves behind.
 */

describe('Binding.targets', () => {
  /**
   * A cursor persisted by an older client stores its target as the legacy local EID (`echo:/<id>`),
   * while `Ref.make` now produces the canonical `echo:///<id>`. Comparing the two raw URI strings
   * reported the binding as absent, which is what kept a bound mailbox offering Connect instead of
   * Sync: both the connect action and the sync action key on this one predicate.
   */

  const makeCursor = (targetUri: string) =>
    Cursor.makeExternal({
      source: Ref.fromURI(URI.make('echo:///01J00J9B45YHYSGZQTQMSKMGJ6')),
      target: Ref.fromURI(URI.make(targetUri)),
    });

  test('matches a target stored in the canonical local form', ({ expect }) => {
    const target = Obj.make(Expando.Expando, { name: 'Inbox' });
    expect(Binding.targets(makeCursor(`echo:///${target.id}`), target)).toBe(true);
  });

  test('matches a target stored in the legacy single-slash form', ({ expect }) => {
    const target = Obj.make(Expando.Expando, { name: 'Inbox' });
    expect(Binding.targets(makeCursor(`echo:/${target.id}`), target)).toBe(true);
  });

  test('matches a target stored in the space-qualified form', ({ expect }) => {
    const target = Obj.make(Expando.Expando, { name: 'Inbox' });
    expect(Binding.targets(makeCursor(`echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/${target.id}`), target)).toBe(true);
  });

  test('does not match a different object', ({ expect }) => {
    const target = Obj.make(Expando.Expando, { name: 'Inbox' });
    const other = Obj.make(Expando.Expando, { name: 'Inbox' });
    expect(Binding.targets(makeCursor(`echo:///${other.id}`), target)).toBe(false);
  });
});

describe('live bindings', () => {
  /**
   * Deleting a `Connection` cascade-deletes the access token it owns but leaves the cursors that
   * referenced it, and a target holding such a dormant binding can neither sync (no credential) nor offer
   * Connect if the binding counts as connected — the mailbox that lost its Gmail connection ended up with
   * no button at all. These cover the one predicate both actions now key on.
   */

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
    expect(Binding.find(cursors, connections, target)).toEqual({ cursor, connection });
    expect(Binding.findDormant(cursors, connections, target)).toEqual([]);
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
    expect(Binding.find(cursors, connections, target)).toBeUndefined();
    // The cursor survives the connection as a dormant binding, and is reported as one.
    expect(Binding.findDormant(cursors, connections, target)).toEqual([cursor]);
    // The Effect form (what `Binding.sync` and the send-mail path resolve through) agrees.
    await expect(
      Binding.queryCursor(target).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise),
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
    expect(Binding.find(cursors, connections, target)).toEqual({ cursor, connection });
    expect(Binding.findDormant(cursors, connections, target)).toEqual([staleCursor]);
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
    expect(Binding.findDormant(cursors, connections, target)).toEqual([cursor]);
  });
});

describe('target account', () => {
  const SOURCE = 'gmail.com';

  test('records and reads the account a target syncs', ({ expect }) => {
    const target = Obj.make(Expando.Expando, { name: 'Inbox' });
    expect(Binding.readAccount(target, SOURCE)).toBeUndefined();

    Binding.recordAccount(target, SOURCE, 'me@example.com');

    expect(Binding.readAccount(target, SOURCE)).toBe('me@example.com');
    // Scoped per service: two providers can each record their own account on one object.
    expect(Binding.readAccount(target, 'other.com')).toBeUndefined();
  });

  test('the first recorded account stands', ({ expect }) => {
    const target = Obj.make(Expando.Expando, { name: 'Inbox' });
    Binding.recordAccount(target, SOURCE, 'me@example.com');
    Binding.recordAccount(target, SOURCE, 'someone-else@example.com');

    expect(Obj.getKeys(target, SOURCE)).toHaveLength(1);
    expect(Binding.readAccount(target, SOURCE)).toBe('me@example.com');
  });

  test('refuses only a contradiction', ({ expect }) => {
    const target = Obj.make(Expando.Expando, { name: 'Inbox' });
    // Nothing recorded: no evidence either way, so bind and start fresh.
    expect(Binding.checkAccount(target, SOURCE, 'me@example.com')).toBe('unknown');

    Binding.recordAccount(target, SOURCE, 'me@example.com');

    expect(Binding.checkAccount(target, SOURCE, 'me@example.com')).toBe('match');
    expect(Binding.checkAccount(target, SOURCE, 'someone-else@example.com')).toBe('mismatch');
    // A credential that reports no account cannot contradict the record.
    expect(Binding.checkAccount(target, SOURCE, undefined)).toBe('unknown');
    // Another service's credential says nothing about this one.
    expect(Binding.checkAccount(target, 'other.com', 'me@other.com')).toBe('unknown');
  });
});

describe('Binding.sync', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Trigger ids force-run through the monitor. */
  const fired: string[] = [];

  const TestSync = Operation.make({
    meta: { key: DXN.make('com.example.operation.binding.sync'), name: 'Test Sync' },
    input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
    output: Schema.Any,
  });

  const connector: ConnectorSpec.ConnectorEntry = {
    id: 'example',
    source: 'example.com',
    sync: { operation: TestSync, trigger: Trigger.specTimer('*/10 * * * *') },
  };

  const recordingMonitor: Trigger.Monitor = {
    triggers: Atom.make<readonly Trigger.State[]>([]),
    localDispatcherEnabled: false,
    invokeTrigger: ({ trigger }) => Effect.sync(() => void fired.push(trigger.id)),
  };

  test('force-runs the sync trigger of the target’s account', async ({ expect }) => {
    const { target, trigger } = await setup();

    await run(target);

    expect(fired).toEqual([trigger.id]);
  });

  test('does nothing for an object with no binding', async ({ expect }) => {
    const { db } = await setup();
    const unbound = db.add(Obj.make(Expando.Expando, { name: 'unbound' }));
    await db.flush({ indexes: true });

    await run(unbound);

    expect(fired).toEqual([]);
  });

  const capabilities = () => {
    const manager = CapabilityManager.make({ registry: Registry.make() });
    manager.contribute({ module: 'test', interface: ConnectorSpec.Connector, implementation: [connector] });
    manager.contribute({
      module: 'test',
      interface: Capabilities.ServiceResolver,
      implementation: ServiceResolver.fromContext(Context.make(Trigger.TriggerMonitorService, recordingMonitor)),
    });
    return manager;
  };

  const setup = async () => {
    fired.length = 0;
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      Connection.Connection,
      Cursor.Cursor,
      AccessToken.AccessToken,
      Trigger.Trigger,
      Expando.Expando,
    ]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok' }));
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }),
    );
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = db.add(Cursor.makeExternal({ source: Ref.make(token), target: Ref.make(target) }));
    invariant(Cursor.isExternal(cursor));
    // The account's routine, not the binding's: its trigger names the connection.
    const trigger = db.add(
      Trigger.make({
        enabled: true,
        spec: Trigger.specTimer('*/10 * * * *'),
        input: { connection: Ref.make(connection) },
      }),
    );
    await db.flush({ indexes: true });
    return { db, target, trigger };
  };

  const run = (target: Obj.Unknown) =>
    Binding.sync(target).pipe(
      Effect.provideService(Capability.Service, capabilities()),
      // Never reached: the connector declares a schedule, so the sync goes through the trigger.
      Effect.provide(operationServiceLayerNoop),
      EffectEx.runPromise,
    );
});

describe('Binding.scaffoldRoutine', () => {
  /** Stands in for a connector's declared `sync.trigger`. */
  const SYNC_SPEC = Trigger.specTimer('*/10 * * * *');

  // Stand-in for a connector's `sync.operation` (e.g. `GoogleOperation.GoogleMailSync`): account-level,
  // taking the same `{ connection, priority? }` shape every real connector's sync declares.
  const TestSync = Operation.make({
    meta: { key: DXN.make('com.example.operation.test.sync'), name: 'Test Sync' },
    input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
    output: Schema.Any,
  });

  const types = [
    Routine.Routine,
    Trigger.Trigger,
    Operation.PersistentOperation,
    AccessToken.AccessToken,
    Connection.Connection,
    Cursor.Cursor,
    Expando.Expando,
  ];

  test('wires an account-level trigger to the connector’s sync operation', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);
    const connection = makeConnection(db);

    const routine = Binding.scaffoldRoutine({ connection, operation: TestSync, spec: SYNC_SPEC });

    const trigger = Binding.triggerOfRoutine(routine);
    expect(trigger?.spec).toEqual({ kind: 'timer', cron: '*/10 * * * *' });
    // Enabled on save: the create-routine dialog is the review step, so a saved routine is one the
    // user has already approved.
    expect(trigger?.enabled).toBe(true);
    // A connector that does not declare `sync.remote` gets a local trigger, with nothing stored.
    expect(trigger?.remote).toBeUndefined();
    // The input names the account, not any one binding — the operation fans out over the bindings at
    // run time — plus the pressed-first hint the fire event resolves.
    expect(Object.keys(trigger?.input ?? {}).sort()).toEqual(['connection', 'priority']);
    expect(trigger?.input?.connection?.uri).toBe(Ref.make(connection).uri);
    expect(trigger?.input?.priority).toBe('{{event.data.priority}}');

    // The action refers to the statically-defined operation by key; nothing is persisted into the space.
    expect(routine.spec?.kind === 'runnable' && routine.spec.runnable.uri).toBe(TestSync.meta.key);
  });

  test('marks the trigger remote for a connector that syncs on EDGE', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);
    const connection = makeConnection(db);

    const routine = Binding.scaffoldRoutine({ connection, operation: TestSync, spec: SYNC_SPEC, remote: true });

    expect(Binding.triggerOfRoutine(routine)?.remote).toBe(true);
  });

  test('persists nothing until the caller adds the draft', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);
    const connection = makeConnection(db);

    const routine = Binding.scaffoldRoutine({ connection, operation: TestSync, spec: SYNC_SPEC });
    await db.flush({ indexes: true });

    // The draft is in memory only: the dialog shows it for editing, and Save is what writes it. Nothing
    // creates a sync routine behind the user's back, which is why there is no in-flight dedupe here.
    expect(await db.query(Filter.type(Routine.Routine)).run()).toHaveLength(0);
    expect(
      await Binding.findTrigger(connection).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise),
    ).toBeUndefined();

    // Adding the draft cascades to its owned trigger, and the account's trigger is then findable —
    // the reverse-ref the sync button uses.
    db.add(routine);
    await db.flush({ indexes: true });
    await expect
      .poll(
        () =>
          Binding.findTrigger(connection)
            .pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise)
            .then((trigger) => trigger?.id),
        { timeout: 5_000 },
      )
      .toBe(Binding.triggerOfRoutine(routine)?.id);
  });

  test('names the routine after the account so several connections stay distinguishable', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);
    const connection = makeConnection(db);
    Obj.update(connection, (connection) => Obj.setLabel(connection, 'work@example.com'));

    const routine = Binding.scaffoldRoutine({ connection, operation: TestSync, spec: SYNC_SPEC });

    expect(routine.name).toBe('Sync — work@example.com');
  });

  test('findRoutine locates the saved routine so deleting the connection takes it too', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);
    const connection = makeConnection(db);

    const routine = Binding.scaffoldRoutine({ connection, operation: TestSync, spec: SYNC_SPEC });
    const saved = db.add(routine);
    await db.flush({ indexes: true });

    const found = await EffectEx.runPromise(Binding.findRoutine(connection).pipe(Effect.provide(Database.layer(db))));

    // Reached through the trigger's `input.connection` reverse-ref, then its owner.
    expect(found?.id).toBe(saved.id);
  });
});

describe('binding lifecycle', () => {
  const SOURCE = 'gmail.example';

  const TestSync = Operation.make({
    meta: { key: DXN.make('com.example.operation.test.bindingLifecycle.sync'), name: 'Test Sync' },
    input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
    output: Schema.Any,
  });

  /** A scheduled connector, so binding a target is expected to leave a Routine to be offered. */
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
      run(Binding.bind({ connection, connector, target: Ref.make(target) }));

    /** A target synced by `account` that has made progress, then had its connection deleted. */
    const dormantBinding = async (account: string) => {
      const connection = addConnection(account);
      const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
      await db.flush({ indexes: true });
      const cursor = await bind(connection, target);
      Cursor.advance(cursor, '1700000000000');
      await db.flush({ indexes: true });

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

    expect(Binding.readAccount(target, SOURCE)).toBe('me@example.com');
  });

  test('deleting a connection leaves its binding dormant rather than discarding it', async ({ expect }) => {
    const { dormantBinding, cursors } = await setup();

    const { cursor } = await dormantBinding('me@example.com');

    expect((await cursors()).map((cursor) => cursor.id)).toEqual([cursor.id]);
    expect(cursor.max).toBe('1700000000000');
  });

  test('re-connecting the same account resumes the dormant binding', async ({ expect }) => {
    const { db, addConnection, run, bind, dormantBinding, triggers, cursors } = await setup();
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
    // No schedule is restored, and none is created: the sync Routine belonged to the connection the
    // disconnect deleted, and a Routine for the new one is only ever made through the create-routine
    // form — which the next sync affordance offers, since `findTrigger` reports none.
    expect(await triggers()).toHaveLength(0);
    expect(await run(Binding.findTrigger(connection))).toBeUndefined();
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
    expect(Binding.readAccount(target, SOURCE)).toBe('me@example.com');
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
    expect(Binding.readAccount(target, SOURCE)).toBe('me@example.com');
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

describe('Binding.syncAll', () => {
  let builder: EchoTestBuilder;
  // One runtime per test, disposed below: `makeInvoker` is called per invocation, so building a
  // runtime there would leak one for every call.
  let runtime: ManagedRuntime.ManagedRuntime<Capability.Service, never>;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    runtime = ManagedRuntime.make(Layer.succeed(Capability.Service, makeCapabilities({ scheduled: false })));
    // Reset here rather than in `setup`, so a test seeding its own database cannot inherit state.
    synced.length = 0;
    fired.length = 0;
    runAgainFor.clear();
    failFor.clear();
    dieFor.clear();
    recorded.reset();
  });

  afterEach(async () => {
    await runtime.dispose();
    await builder.close();
  });

  /** Bindings synced, in invocation order. */
  const synced: string[] = [];

  /** Trigger ids force-run through the monitor. */
  const fired: string[] = [];

  /** Binding uris whose sync should request `Operation.runAgain()` (a capped run with work left). */
  const runAgainFor = new Set<string>();

  /** Binding uris whose sync should fail on the typed channel, by error. */
  const failFor = new Map<string, unknown>();

  /** Binding uris whose sync should die (defect channel), by defect. */
  const dieFor = new Map<string, unknown>();

  // The auto-sync capability forks the sync and returns without waiting for it, so the auto-sync
  // tests below await this instead of polling `synced`/`fired` for the forked work to land.
  const recorded = new AsyncTrigger();

  /** Records each binding, then applies whichever fault is configured for it. */
  const recordingSync = (binding: Cursor.ExternalCursor) =>
    Effect.gen(function* () {
      const uri = Ref.make(binding).uri;
      synced.push(uri);
      recorded.wake();
      if (runAgainFor.has(uri)) {
        return yield* Operation.runAgain();
      }
      if (dieFor.has(uri)) {
        return yield* Effect.die(dieFor.get(uri));
      }
      if (failFor.has(uri)) {
        return yield* Effect.fail(failFor.get(uri));
      }
    });

  // Stand-in for a connector's account-level `sync.operation`: its handler wraps the shared
  // fan-out over a per-binding sync, the shape every migrated connector follows.
  const TestSync = Operation.make({
    meta: { key: DXN.make('com.example.operation.test.syncFanout.sync'), name: 'Test Sync' },
    input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
    output: Schema.Any,
  });

  const syncHandler = TestSync.pipe(
    Operation.withHandler(({ connection, priority }) =>
      Binding.syncAll({
        connection,
        priority,
        sync: recordingSync,
      }),
    ),
  );

  const recordingMonitor: Trigger.Monitor = {
    triggers: Atom.make<readonly Trigger.State[]>([]),
    localDispatcherEnabled: false,
    invokeTrigger: ({ trigger }) =>
      Effect.sync(() => {
        fired.push(trigger.id);
        recorded.wake();
      }),
  };

  test('fans out to each binding', async ({ expect }) => {
    const { db, connection, cursor } = await setup();
    // A trigger in the space changes nothing: the operation is the routine's runnable, so its
    // handler never routes through triggers (that would recurse) — it always syncs the bindings.
    await addConnectionSyncTrigger(db, connection);

    const result = await invokeSync(connection);

    expect(result.synced).toBe(1);
    expect(synced).toEqual([Ref.make(cursor).uri]);
    expect(fired).toEqual([]);
  });

  test('syncs the priority binding first', async ({ expect }) => {
    const { db, connection, cursor, token } = await setup();
    const second = await addCursor(db, token);

    await invokeSync(connection, second.id);

    // Pressed-first ordering: the priority cursor grabs a fan-out slot immediately.
    expect(synced[0]).toBe(Ref.make(second).uri);
    expect(synced).toHaveLength(2);
    expect(synced).toContain(Ref.make(cursor).uri);
  });

  test('re-raises runAgain after every binding had its turn', async ({ expect }) => {
    const { db, connection, cursor, token } = await setup();
    const second = await addCursor(db, token);
    runAgainFor.add(Ref.make(cursor).uri);

    // Continuation is re-raised at the operation level so a dispatcher-driven run resumes; a direct
    // invocation like this one surfaces it as a defect.
    await expect(invokeSync(connection)).rejects.toThrow();

    // The capped binding never starves its siblings: both were attempted before the re-raise.
    expect(synced).toContain(Ref.make(cursor).uri);
    expect(synced).toContain(Ref.make(second).uri);
  });

  test('collects every binding before surfacing a failure', async ({ expect }) => {
    const { db, connection, cursor, token } = await setup();
    const second = await addCursor(db, token);
    failFor.set(Ref.make(cursor).uri, { message: 'boom' });

    const outcome = await runFanOut(connection);

    // A failing binding must not stop its sibling from running.
    expect(synced).toContain(Ref.make(cursor).uri);
    expect(synced).toContain(Ref.make(second).uri);
    expect(outcome._tag).toBe('Failure');
  });

  test('retags a 401 raised on the typed channel', async ({ expect }) => {
    const { connection, cursor } = await setup();
    failFor.set(Ref.make(cursor).uri, { code: 401 });

    const outcome = await runFanOut(connection);

    invariant(outcome._tag === 'Failure');
    expect(outcome.failure).toBeInstanceOf(ConnectionAuthExpiredError);
  });

  test('retags a 401 raised as a defect', async ({ expect }) => {
    const { connection, cursor } = await setup();
    dieFor.set(Ref.make(cursor).uri, { status: 401 });

    const outcome = await runFanOut(connection);

    invariant(outcome._tag === 'Failure');
    expect(outcome.failure).toBeInstanceOf(ConnectionAuthExpiredError);
  });

  test('retags a 401 buried in a wrapper’s cause', async ({ expect }) => {
    const { connection, cursor } = await setup();
    // `MailSyncError.wrap()` leaves the provider's 401 reachable only via `cause`.
    failFor.set(Ref.make(cursor).uri, { _tag: 'MailSyncError', cause: { code: 401 } });

    const outcome = await runFanOut(connection);

    invariant(outcome._tag === 'Failure');
    expect(outcome.failure).toBeInstanceOf(ConnectionAuthExpiredError);
  });

  test('auth expiry outranks a plain failure from another binding', async ({ expect }) => {
    const { db, connection, cursor, token } = await setup();
    const second = await addCursor(db, token);
    failFor.set(Ref.make(cursor).uri, { message: 'boom' });
    failFor.set(Ref.make(second).uri, { code: 401 });

    const outcome = await runFanOut(connection);

    // Auth expiry carries the reauthenticate affordance, so it outranks an ordinary failure.
    invariant(outcome._tag === 'Failure');
    expect(outcome.failure).toBeInstanceOf(ConnectionAuthExpiredError);
  });

  test('keeps one output per binding for a void-returning sync', async ({ expect }) => {
    const { db, connection, token } = await setup();
    await addCursor(db, token);

    const outcome = await runFanOut(connection);

    // A void sync's `undefined` is a real output, not a sentinel to filter.
    invariant(outcome._tag === 'Success');
    expect(outcome.success.synced).toBe(2);
    expect(outcome.success.outputs).toHaveLength(2);
  });

  test('a failure outranks a sibling’s runAgain', async ({ expect }) => {
    const { db, connection, cursor, token } = await setup();
    const second = await addCursor(db, token);
    runAgainFor.add(Ref.make(cursor).uri);
    failFor.set(Ref.make(second).uri, { message: 'boom' });

    const outcome = await runFanOut(connection);

    // The capped binding resumes on the next scheduled run, so the failure is what needs reporting.
    invariant(outcome._tag === 'Failure');
    expect(outcome.failure).not.toBeInstanceOf(ConnectionAuthExpiredError);
  });

  test('auto-syncs a new connection when its connector opts in', async ({ expect }) => {
    const { db, connection, cursor } = await setup();
    const connector = makeConnector({ scheduled: false, auto: true });

    await EffectEx.runPromise(
      autoSyncConnection(makeInvoker(), makeCapabilities({ scheduled: false }), db, connector, connection),
    );

    // Forked so connection setup returns without waiting; wait for the sync itself to land.
    await recorded.wait();
    expect(synced).toEqual([Ref.make(cursor).uri]);
  });

  test('auto-sync of a scheduled connector force-runs the account routine’s trigger', async ({ expect }) => {
    const { db, connection } = await setup();
    const trigger = await addConnectionSyncTrigger(db, connection);
    const connector = makeConnector({ scheduled: true, auto: true });

    await EffectEx.runPromise(
      autoSyncConnection(makeInvoker(), makeCapabilities({ scheduled: true }), db, connector, connection),
    );

    // The trigger dispatcher runs the sync (durable execution), so the operation is not invoked here.
    await recorded.wait();
    expect(fired).toEqual([trigger.id]);
    expect(synced).toEqual([]);
  });

  test('auto-sync skips a scheduled connector whose routine is missing', async ({ expect }) => {
    const { db, connection } = await setup();
    const connector = makeConnector({ scheduled: true, auto: true });

    await EffectEx.runPromise(
      autoSyncConnection(makeInvoker(), makeCapabilities({ scheduled: true }), db, connector, connection),
    );

    // The user declined the routine: no silent recreation, no sync.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(synced).toEqual([]);
    expect(fired).toEqual([]);
  });

  test('does not auto-sync a connection whose connector omits the flag', async ({ expect }) => {
    const { db, connection } = await setup();
    const connector = makeConnector({ scheduled: false });

    await EffectEx.runPromise(
      autoSyncConnection(makeInvoker(), makeCapabilities({ scheduled: false }), db, connector, connection),
    );

    expect(synced).toEqual([]);
    expect(fired).toEqual([]);
  });

  /**
   * A connector that keeps its bindings in sync on a schedule (`scheduled`) declares a trigger spec
   * for its account routine; one without a spec syncs on demand only.
   */
  const makeConnector = ({
    scheduled,
    auto,
  }: {
    scheduled: boolean;
    auto?: boolean;
  }): ConnectorSpec.ConnectorEntry => ({
    id: 'example',
    source: 'example.com',
    sync: {
      operation: TestSync,
      ...(auto ? { auto: true } : {}),
      ...(scheduled ? { trigger: Trigger.specTimer('*/10 * * * *') } : {}),
    },
  });

  /**
   * Capabilities `Binding.runSync` reads: the connector registry, plus a `ServiceResolver` that
   * resolves the space's trigger monitor.
   */
  const makeCapabilities = ({ scheduled }: { scheduled: boolean }) => {
    const manager = CapabilityManager.make({ registry: Registry.make() });
    manager.contribute({
      module: 'test',
      interface: ConnectorSpec.Connector,
      implementation: [makeConnector({ scheduled })],
    });
    manager.contribute({
      module: 'test',
      interface: Capabilities.ServiceResolver,
      implementation: ServiceResolver.fromContext(Context.make(Trigger.TriggerMonitorService, recordingMonitor)),
    });
    return manager;
  };

  const makeInvoker = () => OperationInvoker.make(() => Effect.succeed([syncHandler]), runtime);

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      Connection.Connection,
      Cursor.Cursor,
      AccessToken.AccessToken,
      Trigger.Trigger,
      Routine.Routine,
      Expando.Expando,
    ]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok' }));
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }),
    );
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = db.add(Cursor.makeExternal({ source: Ref.make(token), target: Ref.make(target) }));
    invariant(Cursor.isExternal(cursor));
    await db.flush({ indexes: true });
    return { db, connection, cursor, token };
  };

  /** An additional binding on the same account. */
  const addCursor = async (db: Database.Database, token: AccessToken.AccessToken) => {
    const target = db.add(Obj.make(Expando.Expando, { name: 'Second' }));
    const cursor = db.add(Cursor.makeExternal({ source: Ref.make(token), target: Ref.make(target) }));
    invariant(Cursor.isExternal(cursor));
    await db.flush({ indexes: true });
    return cursor;
  };

  /** The account routine's trigger, as `Binding.scaffoldRoutine` wires it. */
  const addConnectionSyncTrigger = async (db: Database.Database, connection: Connection.Connection) => {
    const trigger = db.add(
      Trigger.make({
        enabled: true,
        spec: Trigger.specTimer('*/10 * * * *'),
        input: { connection: Ref.make(connection), priority: '{{event.data.priority}}' },
      }),
    );
    await db.flush({ indexes: true });
    return trigger;
  };

  /** Runs the fan-out directly, since the invoker `orDie`s handler failures out of view. */
  const runFanOut = (connection: Connection.Connection, priority?: string) =>
    EffectEx.runPromise(
      Binding.syncAll({
        connection: Ref.make(connection),
        priority,
        sync: recordingSync,
      }).pipe(Effect.result),
    );

  const invokeSync = (
    connection: Connection.Connection,
    priority?: string,
  ): Promise<{ synced: number; outputs: unknown[] }> =>
    EffectEx.runPromise(makeInvoker().invoke(TestSync, { connection: Ref.make(connection), priority }));
});

const initSpace = async (harness: Awaited<ReturnType<typeof createComposerTestApp>>) => {
  const { defaultSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return defaultSpace.db;
};

const makeConnection = (db: Database.Database) => {
  const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok', account: 'a@b.c' }));
  return db.add(Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }));
};
