//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { CapabilityManager } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trigger from '@dxos/compute/Trigger';
import { type Database, DXN, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Cursor } from '@dxos/link';
import { OperationInvoker } from '@dxos/operation';
import { Expando } from '@dxos/schema';

import { Connection, Connector, type ConnectorEntry, ConnectorOperation } from '#types';

import { autoSyncConnection } from '../capabilities/connector-coordinator/auto-sync';
import SyncConnectionHandler from './sync-connection';

describe('SyncConnection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Bindings the connector's own sync operation was invoked for. */
  const synced: string[] = [];

  /** Trigger ids force-run through the monitor. */
  const fired: string[] = [];

  // Stand-in for a connector's `sync.operation` (e.g. `InboxOperation.GoogleMailSync`): same
  // `{ binding }` input every real connector's sync declares.
  const TestSync = Operation.make({
    meta: { key: DXN.make('org.dxos.test.syncConnection.sync'), name: 'Test Sync' },
    input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
    output: Schema.Any,
  });

  const syncHandler = TestSync.pipe(
    Operation.withHandler(({ binding }) => Effect.sync(() => void synced.push(binding.uri))),
  );

  const recordingMonitor: Trigger.Monitor = {
    triggers: Atom.make<readonly Trigger.State[]>([]),
    localDispatcherEnabled: false,
    invokeTrigger: ({ trigger }) => Effect.sync(() => void fired.push(trigger.id)),
  };

  test('invokes the sync operation directly for a connector with no trigger spec', async ({ expect }) => {
    const { db, connection, cursor } = await setup();
    // Even with a trigger in the space, a connector that declares no schedule syncs on demand only.
    await addSyncTrigger(db, cursor);

    const result = await invokeSync(makeInvoker({ scheduled: false }), connection);

    expect(result.synced).toBe(1);
    expect(synced).toEqual([Ref.make(cursor).uri]);
    expect(fired).toEqual([]);
  });

  test('force-runs the binding’s trigger for a connector with a trigger spec', async ({ expect }) => {
    const { db, connection, cursor } = await setup();
    const trigger = await addSyncTrigger(db, cursor);

    const result = await invokeSync(makeInvoker({ scheduled: true }), connection);

    expect(result.synced).toBe(1);
    // The trigger dispatcher runs the sync, so the operation is not invoked here.
    expect(fired).toEqual([trigger.id]);
    expect(synced).toEqual([]);
  });

  test('creates the sync routine when a scheduled binding has none yet', async ({ expect }) => {
    const { connection } = await setup();

    const result = await invokeSync(makeInvoker({ scheduled: true }), connection);

    expect(result.synced).toBe(1);
    // The routine was created from the declared spec and its trigger force-run.
    expect(fired).toHaveLength(1);
    expect(synced).toEqual([]);
  });

  test('does not sync directly when a scheduled binding’s trigger cannot be run', async ({ expect }) => {
    const { db, connection, cursor } = await setup();
    await addSyncTrigger(db, cursor);

    // The trigger is the sync path for a scheduled connector, so with no monitor to run it the sync
    // fails rather than quietly running outside the dispatcher (and losing its durable execution).
    await expect(invokeSync(makeInvoker({ scheduled: true, withMonitor: false }), connection)).rejects.toThrow();

    expect(synced).toEqual([]);
    expect(fired).toEqual([]);
  });

  test('does nothing when no connector is registered for the connection', async ({ expect }) => {
    const { connection } = await setup();
    // An unregistered connector id resolves to no entry, so there is no sync to run.
    Obj.update(connection, (connection) => {
      connection.connectorId = 'unregistered';
    });

    const result = await invokeSync(makeInvoker({ scheduled: true }), connection);

    expect(result.synced).toBe(0);
    expect(synced).toEqual([]);
    expect(fired).toEqual([]);
  });

  test('auto-syncs a new connection when its connector opts in', async ({ expect }) => {
    const { db, connection, cursor } = await setup();
    const connector = makeConnector({ scheduled: false, auto: true });

    await EffectEx.runPromise(autoSyncConnection(makeInvoker({ scheduled: false }), db, connector, connection));

    // Forked so connection setup returns without waiting, so the sync lands after this call.
    await expect.poll(() => synced).toEqual([Ref.make(cursor).uri]);
  });

  test('does not auto-sync a connection whose connector omits the flag', async ({ expect }) => {
    const { db, connection } = await setup();
    const connector = makeConnector({ scheduled: false });

    await EffectEx.runPromise(autoSyncConnection(makeInvoker({ scheduled: false }), db, connector, connection));

    expect(synced).toEqual([]);
    expect(fired).toEqual([]);
  });

  /**
   * A connector that keeps its bindings in sync on a schedule (`scheduled`) syncs by force-running
   * the Routine's trigger; one without a spec is invoked directly, which is the distinction under test.
   */
  const makeConnector = ({ scheduled, auto }: { scheduled: boolean; auto?: boolean }): ConnectorEntry => ({
    id: 'example',
    source: 'example.com',
    sync: {
      operation: TestSync,
      ...(auto ? { auto: true } : {}),
      ...(scheduled ? { trigger: Trigger.specTimer('*/10 * * * *') } : {}),
    },
  });

  /**
   * Capabilities the handler reads: the connector registry, plus — unless `withMonitor` is false — a
   * `ServiceResolver` that resolves the space's trigger monitor. Omitting it is the CLI/workerd shape,
   * where a scheduled connector must still sync by direct invocation.
   */
  const makeCapabilities = ({ scheduled, withMonitor }: { scheduled: boolean; withMonitor: boolean }) => {
    const manager = CapabilityManager.make({ registry: Registry.make() });
    manager.contribute({ module: 'test', interface: Connector, implementation: [makeConnector({ scheduled })] });
    if (withMonitor) {
      manager.contribute({
        module: 'test',
        interface: Capabilities.ServiceResolver,
        implementation: ServiceResolver.fromContext(Context.make(Trigger.TriggerMonitorService, recordingMonitor)),
      });
    }
    return manager;
  };

  const makeInvoker = (options: { scheduled: boolean; withMonitor?: boolean }) =>
    OperationInvoker.make(
      () => Effect.succeed([SyncConnectionHandler, syncHandler]),
      ManagedRuntime.make(
        Layer.succeed(
          Capability.Service,
          makeCapabilities({ scheduled: options.scheduled, withMonitor: options.withMonitor ?? true }),
        ),
      ),
    );

  const setup = async () => {
    synced.length = 0;
    fired.length = 0;
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
    return { db, connection, cursor };
  };

  /** A sync Routine's trigger for a binding, as `ensureSyncTrigger` would have created it. */
  const addSyncTrigger = async (db: Database.Database, cursor: Cursor.ExternalCursor) => {
    const trigger = db.add(
      Trigger.make({
        enabled: true,
        spec: Trigger.specTimer('*/10 * * * *'),
        input: { binding: Ref.make(cursor) },
      }),
    );
    await db.flush({ indexes: true });
    return trigger;
  };

  const invokeSync = (invoker: ReturnType<typeof makeInvoker>, connection: Connection.Connection) =>
    EffectEx.runPromise(invoker.invoke(ConnectorOperation.SyncConnection, { connection: Ref.make(connection) }));
});
