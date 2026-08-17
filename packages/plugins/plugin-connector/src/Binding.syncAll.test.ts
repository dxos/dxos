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
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trigger from '@dxos/compute/Trigger';
import { type Database, DXN, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { OperationInvoker } from '@dxos/operation';
import { Expando } from '@dxos/schema';

import { ConnectorSpec } from '#types';

import * as Binding from './Binding';
import { autoSyncConnection } from './capabilities/connector-coordinator/auto-sync';

describe('Binding.syncAll', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Bindings synced, in invocation order. */
  const synced: string[] = [];

  /** Trigger ids force-run through the monitor. */
  const fired: string[] = [];

  /** Binding uris whose sync should request `Operation.runAgain()` (a capped run with work left). */
  const runAgainFor = new Set<string>();

  // Stand-in for a connector's account-level `sync.operation`: its handler wraps the shared
  // fan-out over a per-binding sync, the shape every migrated connector follows.
  const TestSync = Operation.make({
    meta: { key: DXN.make('org.dxos.test.syncFanout.sync'), name: 'Test Sync' },
    input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
    output: Schema.Any,
  });

  const syncHandler = TestSync.pipe(
    Operation.withHandler(({ connection, priority }) =>
      Binding.syncAll({
        connection,
        priority,
        sync: (binding) =>
          Effect.gen(function* () {
            const uri = Ref.make(binding).uri;
            synced.push(uri);
            if (runAgainFor.has(uri)) {
              yield* Operation.runAgain();
            }
          }),
      }),
    ),
  );

  const recordingMonitor: Trigger.Monitor = {
    triggers: Atom.make<readonly Trigger.State[]>([]),
    localDispatcherEnabled: false,
    invokeTrigger: ({ trigger }) => Effect.sync(() => void fired.push(trigger.id)),
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

  test('auto-syncs a new connection when its connector opts in', async ({ expect }) => {
    const { db, connection, cursor } = await setup();
    const connector = makeConnector({ scheduled: false, auto: true });

    await EffectEx.runPromise(
      autoSyncConnection(makeInvoker(), makeCapabilities({ scheduled: false }), db, connector, connection),
    );

    // Forked so connection setup returns without waiting, so the sync lands after this call.
    await expect.poll(() => synced).toEqual([Ref.make(cursor).uri]);
  });

  test('auto-sync of a scheduled connector force-runs the account routine’s trigger', async ({ expect }) => {
    const { db, connection } = await setup();
    const trigger = await addConnectionSyncTrigger(db, connection);
    const connector = makeConnector({ scheduled: true, auto: true });

    await EffectEx.runPromise(
      autoSyncConnection(makeInvoker(), makeCapabilities({ scheduled: true }), db, connector, connection),
    );

    // The trigger dispatcher runs the sync (durable execution), so the operation is not invoked here.
    await expect.poll(() => fired).toEqual([trigger.id]);
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
   * Capabilities `runConnectionSync` reads: the connector registry, plus a `ServiceResolver` that
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

  const makeInvoker = () =>
    OperationInvoker.make(
      () => Effect.succeed([syncHandler]),
      ManagedRuntime.make(Layer.succeed(Capability.Service, makeCapabilities({ scheduled: false }))),
    );

  const setup = async () => {
    synced.length = 0;
    fired.length = 0;
    runAgainFor.clear();
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

  /** The account routine's trigger, as `scaffoldConnectionSyncRoutine` wires it. */
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

  const invokeSync = (
    connection: Connection.Connection,
    priority?: string,
  ): Promise<{ synced: number; outputs: unknown[] }> =>
    EffectEx.runPromise(makeInvoker().invoke(TestSync, { connection: Ref.make(connection), priority }));
});
