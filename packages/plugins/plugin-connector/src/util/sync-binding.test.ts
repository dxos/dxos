//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { operationServiceLayerNoop } from '@dxos/compute/testing';
import * as Trigger from '@dxos/compute/Trigger';
import { DXN, Obj, Ref } from '@dxos/echo';
import { type RemoteIndexSync } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';

import { ConnectorSpec } from '#types';

import { syncTarget } from './sync-target';

/**
 * Covers the DX-1153 barrier on the path that force-runs a remote sync trigger: EDGE resolves the
 * trigger through an index query, so the client waits for EDGE to have indexed it first.
 */
describe('syncBinding (remote connector)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Ordered log of what happened, so the barrier can be asserted to precede the force-run. */
  let events: string[] = [];

  const TestSync = Operation.make({
    meta: { key: DXN.make('org.dxos.test.syncBinding.sync'), name: 'Test Sync' },
    input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
    output: Schema.Any,
  });

  const connector: ConnectorSpec.ConnectorEntry = {
    id: 'example',
    source: 'example.com',
    sync: { operation: TestSync, trigger: Trigger.specTimer('*/10 * * * *'), remote: true },
  };

  const recordingMonitor: Trigger.Monitor = {
    triggers: Atom.make<readonly Trigger.State[]>([]),
    localDispatcherEnabled: false,
    invokeTrigger: () => Effect.sync(() => void events.push('fired')),
  };

  test('waits for the remote index before force-running the trigger', async ({ expect }) => {
    const indexed: RemoteIndexSync = {
      awaitIndexed: async () => {
        events.push('awaited');
        return { indexed: true, pending: [] };
      },
    };
    const { target } = await setup(indexed);

    await run(target);

    expect(events).toEqual(['awaited', 'fired']);
  });

  test('still force-runs the trigger when no EDGE transport is configured', async ({ expect }) => {
    // The barrier is best-effort — failing the sync outright would be worse than the race it guards.
    const { target } = await setup();

    await run(target);

    expect(events).toEqual(['fired']);
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

  const setup = async (remoteIndexSync?: RemoteIndexSync) => {
    events = [];
    // Not `await using` — the peer must outlive this helper; the builder closes it in `afterEach`.
    const peer = await builder.createPeer();
    const client = await peer.createClient({ remoteIndexSync });
    const db = await peer.createDatabase(PublicKey.random(), { client });
    client.graph.registry.add([
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
    db.add(
      Trigger.make({ enabled: true, spec: Trigger.specTimer('*/10 * * * *'), input: { binding: Ref.make(cursor) } }),
    );
    await db.flush({ indexes: true });
    return { db, target };
  };

  const run = (target: Obj.Unknown) =>
    syncTarget(target).pipe(
      Effect.provideService(Capability.Service, capabilities()),
      // Never reached: the connector declares a schedule, so the sync goes through the trigger.
      Effect.provide(operationServiceLayerNoop),
      EffectEx.runPromise,
    );
});
