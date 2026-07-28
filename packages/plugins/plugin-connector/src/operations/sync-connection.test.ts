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

import { Capabilities, Capability, CapabilityManager } from '@dxos/app-framework';
import { Operation, ServiceResolver, Trigger } from '@dxos/compute';
import { type Database, DXN, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Cursor } from '@dxos/link';
import { OperationInvoker } from '@dxos/operation';
import { Expando } from '@dxos/schema';

import { Connection, Connector, type ConnectorEntry, ConnectorOperation } from '#types';

import SyncConnectionHandler from './sync-connection';

describe('SyncConnection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Cursor ids the connector's own sync operation was invoked for. */
  const synced: string[] = [];

  /** Trigger ids force-run through the monitor — the seam a routine-backed binding must reach instead. */
  const fired: string[] = [];

  // Stand-in for a connector's `sync` (e.g. `InboxOperation.GoogleMailSync`): same `{ binding }` input
  // every real connector's sync declares.
  const TestSync = Operation.make({
    meta: { key: DXN.make('org.dxos.test.syncConnection.sync') },
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

  const connector: ConnectorEntry = { id: 'example', source: 'example.com', sync: TestSync };

  /**
   * A capability manager carrying the connector registry the handler reads. `withMonitor` also
   * contributes a `ServiceResolver` that resolves the space's trigger monitor; leaving it out is the
   * CLI/workerd shape, where the handler must fall back to invoking the sync directly.
   */
  const makeCapabilities = ({ withMonitor }: { withMonitor: boolean }) => {
    const manager = CapabilityManager.make({ registry: Registry.make() });
    manager.contribute({ module: 'test', interface: Connector, implementation: [connector] });
    if (withMonitor) {
      manager.contribute({
        module: 'test',
        interface: Capabilities.ServiceResolver,
        implementation: ServiceResolver.fromContext(Context.make(Trigger.TriggerMonitorService, recordingMonitor)),
      });
    }
    return manager;
  };

  const makeInvoker = ({ withMonitor }: { withMonitor: boolean }) =>
    OperationInvoker.make(
      () => Effect.succeed([SyncConnectionHandler, syncHandler]),
      ManagedRuntime.make(Layer.succeed(Capability.Service, makeCapabilities({ withMonitor }))),
    );

  const setup = async () => {
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
    await db.flush({ indexes: true });
    return { db, connection, cursor };
  };

  /** The sync Routine's trigger for a binding: a timer trigger whose input binds the cursor. */
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

  test('invokes the connector sync for a binding with no sync routine', async ({ expect }) => {
    synced.length = 0;
    fired.length = 0;
    const { connection, cursor } = await setup();

    const result = await invokeSync(makeInvoker({ withMonitor: true }), connection);

    expect(result.synced).toBe(1);
    expect(synced).toEqual([Ref.make(cursor).uri]);
    expect(fired).toEqual([]);
  });

  test('force-runs the binding’s sync trigger when a routine exists', async ({ expect }) => {
    synced.length = 0;
    fired.length = 0;
    const { db, connection, cursor } = await setup();
    const trigger = await addSyncTrigger(db, cursor);

    const result = await invokeSync(makeInvoker({ withMonitor: true }), connection);

    expect(result.synced).toBe(1);
    // The trigger dispatcher runs the sync, so the operation is not invoked here.
    expect(fired).toEqual([trigger.id]);
    expect(synced).toEqual([]);
  });

  test('falls back to the connector sync when the space has no trigger monitor', async ({ expect }) => {
    synced.length = 0;
    fired.length = 0;
    const { db, connection, cursor } = await setup();
    await addSyncTrigger(db, cursor);

    const result = await invokeSync(makeInvoker({ withMonitor: false }), connection);

    expect(result.synced).toBe(1);
    expect(synced).toEqual([Ref.make(cursor).uri]);
    expect(fired).toEqual([]);
  });

  test('does nothing for a connector with no sync operation', async ({ expect }) => {
    synced.length = 0;
    fired.length = 0;
    const { db, connection, cursor } = await setup();
    await addSyncTrigger(db, cursor);
    // An unregistered connector id resolves to no connector entry, so there is no sync to run.
    Obj.update(connection, (connection) => {
      connection.connectorId = 'unregistered';
    });

    const result = await invokeSync(makeInvoker({ withMonitor: true }), connection);

    expect(result.synced).toBe(0);
    expect(synced).toEqual([]);
    expect(fired).toEqual([]);
  });
});
