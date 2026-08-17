//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
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
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { connectedRoutinesQuery } from '@dxos/plugin-routine';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Expando } from '@dxos/schema';

import { ConnectorSpec } from '#types';

import * as Binding from './Binding';
import { TargetAccountMismatchError } from './errors';
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

  const makeTarget = () => Obj.make(Expando.Expando, { name: 'Inbox' });

  const makeCursor = (targetUri: string) =>
    Cursor.makeExternal({
      source: Ref.fromURI(URI.make('echo:///01J00J9B45YHYSGZQTQMSKMGJ6')),
      target: Ref.fromURI(URI.make(targetUri)),
    });

  test('matches a target stored in the canonical local form', () => {
    const target = makeTarget();
    expect(Binding.targets(makeCursor(`echo:///${target.id}`), target)).toBe(true);
  });

  test('matches a target stored in the legacy single-slash form', () => {
    const target = makeTarget();
    expect(Binding.targets(makeCursor(`echo:/${target.id}`), target)).toBe(true);
  });

  test('matches a target stored in the space-qualified form', () => {
    const target = makeTarget();
    expect(Binding.targets(makeCursor(`echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/${target.id}`), target)).toBe(true);
  });

  test('does not match a different object', () => {
    const target = makeTarget();
    const other = makeTarget();
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

  test('records and reads the account a target syncs', () => {
    const target = makeTarget();
    expect(Binding.readAccount(target, SOURCE)).toBeUndefined();

    Binding.recordAccount(target, SOURCE, 'me@example.com');

    expect(Binding.readAccount(target, SOURCE)).toBe('me@example.com');
    // Scoped per service: two providers can each record their own account on one object.
    expect(Binding.readAccount(target, 'other.com')).toBeUndefined();
  });

  test('the first recorded account stands', () => {
    const target = makeTarget();
    Binding.recordAccount(target, SOURCE, 'me@example.com');
    Binding.recordAccount(target, SOURCE, 'someone-else@example.com');

    expect(Obj.getKeys(target, SOURCE)).toHaveLength(1);
    expect(Binding.readAccount(target, SOURCE)).toBe('me@example.com');
  });

  test('refuses only a contradiction', () => {
    const target = makeTarget();
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

const makeTarget = () => Obj.make(Expando.Expando, { name: 'Inbox' });

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
    meta: { key: DXN.make('org.dxos.test.Binding.sync.sync'), name: 'Test Sync' },
    input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
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

  test('force-runs the sync trigger of the target’s binding', async ({ expect }) => {
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
    db.add(Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }));
    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = db.add(Cursor.makeExternal({ source: Ref.make(token), target: Ref.make(target) }));
    invariant(Cursor.isExternal(cursor));
    const trigger = db.add(
      Trigger.make({ enabled: true, spec: Trigger.specTimer('*/10 * * * *'), input: { binding: Ref.make(cursor) } }),
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

describe('Binding.createRoutine', () => {
  /** Stands in for a connector's declared `sync.trigger`. */
  const SYNC_SPEC = Trigger.specTimer('*/10 * * * *');

  // Stand-in for a connector's `sync.operation` (e.g. `GoogleOperation.GoogleMailSync`): takes the same
  // `{ binding: Ref<Cursor> }` shape every real connector's sync declares.
  const TestSync = Operation.make({
    meta: { key: DXN.make('org.dxos.test.sync'), name: 'Test Sync' },
    input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
    output: Schema.Any,
  });

  const types = [
    Routine.Routine,
    Trigger.Trigger,
    Operation.PersistentOperation,
    AccessToken.AccessToken,
    Cursor.Cursor,
    Expando.Expando,
  ];

  const initSpace = async (harness: Awaited<ReturnType<typeof createComposerTestApp>>) => {
    const { defaultSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.waitForEvent(ClientEvents.SpacesReady);
    return defaultSpace.db;
  };

  /** Persists an external-sync cursor targeting `target`, standing in for a connector-created binding. */
  const makeCursor = (db: Database.Database, target: Obj.Unknown): Cursor.ExternalCursor => {
    const accessToken = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok' }));
    const cursor = db.add(Cursor.makeExternal({ source: Ref.make(accessToken), target: Ref.make(target) }));
    invariant(Cursor.isExternal(cursor));
    return cursor;
  };

  const findSyncRoutine = (db: Database.Database, target: Obj.Unknown) =>
    db
      .query(connectedRoutinesQuery(target))
      .run()
      .then((routines) =>
        routines.filter((routine) => routine.triggers.some((ref) => ref.target?.spec?.kind === 'timer')),
      );

  test('creates a routine with a timer trigger bound to the target’s cursor', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);

    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = makeCursor(db, target);
    const created = await Binding.createRoutine({ target, cursor, operation: TestSync, spec: SYNC_SPEC }).pipe(
      Effect.provide(Database.layer(db)),
      EffectEx.runPromise,
    );
    await db.flush();

    await expect.poll(() => findSyncRoutine(db, target), { timeout: 5_000 }).toHaveLength(1);
    const [routine] = await findSyncRoutine(db, target);
    const [triggerRef] = routine.triggers;
    const trigger = triggerRef.target;
    expect(trigger?.spec).toEqual({ kind: 'timer', cron: '*/10 * * * *' });
    expect(trigger?.enabled).toBe(true);
    // A connector that does not declare `sync.remote` gets a local trigger, with nothing stored.
    expect(trigger?.remote).toBeUndefined();
    // `input` carries only `binding` (matching the sync operation's input schema); the target is reached
    // through the binding cursor's `spec.target`, not smuggled in as an extra input key.
    expect(Object.keys(trigger?.input ?? {})).toEqual(['binding']);
    expect(trigger?.input?.binding?.uri).toBe(Ref.make(cursor).uri);
    expect(created?.id).toBe(trigger?.id);

    // The action refers to the statically-defined operation by key; nothing is persisted into the space.
    expect(routine.spec?.kind === 'runnable' && routine.spec.runnable.uri).toBe(TestSync.meta.key);
    expect(await db.query(Filter.type(Operation.PersistentOperation)).run()).toHaveLength(0);

    // The reverse-ref from the cursor is how a manual sync finds this trigger to force-run.
    const found = await Binding.findTrigger(cursor).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
    expect(found?.id).toBe(trigger?.id);
  });

  test('marks the trigger remote for a connector that syncs on EDGE', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);

    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = makeCursor(db, target);
    await Binding.createRoutine({ target, cursor, operation: TestSync, spec: SYNC_SPEC, remote: true }).pipe(
      Effect.provide(Database.layer(db)),
      EffectEx.runPromise,
    );
    await db.flush();

    await expect.poll(() => findSyncRoutine(db, target), { timeout: 5_000 }).toHaveLength(1);
    const [routine] = await findSyncRoutine(db, target);
    // The monitor routes a `remote` trigger to EDGE, so the schedule keeps running with the app closed.
    expect(routine.triggers[0].target?.remote).toBe(true);
  });

  test('is idempotent: a second call is a no-op once a sync routine is connected', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);

    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = makeCursor(db, target);
    const run = () =>
      Binding.createRoutine({ target, cursor, operation: TestSync, spec: SYNC_SPEC }).pipe(
        Effect.provide(Database.layer(db)),
        EffectEx.runPromise,
      );
    const first = await run();
    await db.flush();
    await expect.poll(() => findSyncRoutine(db, target), { timeout: 5_000 }).toHaveLength(1);

    const second = await run();
    await db.flush();

    expect(await findSyncRoutine(db, target)).toHaveLength(1);
    // The second call returns the same, pre-existing trigger rather than creating another.
    expect(second?.id).toBe(first?.id);
  });

  test('two calls racing on one binding create a single routine', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({ types })] });
    const db = await initSpace(harness);

    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = makeCursor(db, target);
    // The existence check is an index query, so it cannot see a routine added moments earlier: without
    // a guard both callers observe none and each persists a schedule, syncing the binding twice a period.
    const [first, second] = await Effect.all(
      [
        Binding.createRoutine({ target, cursor, operation: TestSync, spec: SYNC_SPEC }),
        Binding.createRoutine({ target, cursor, operation: TestSync, spec: SYNC_SPEC }),
      ],
      { concurrency: 'unbounded' },
    ).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
    await db.flush();

    expect(second?.id).toBe(first?.id);
    await expect.poll(() => findSyncRoutine(db, target), { timeout: 5_000 }).toHaveLength(1);
  });
});

describe('binding lifecycle', () => {
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
    // One schedule, still pointed at the resumed cursor rather than a duplicate.
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
