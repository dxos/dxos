//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { CapabilityManager } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { operationServiceLayerNoop } from '@dxos/compute/testing';
import * as Trigger from '@dxos/compute/Trigger';
import { DXN, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';

import * as ConnectorSpec from '../types/ConnectorSpec';
import { syncTarget } from './sync-target';

describe('syncTarget', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Trigger ids force-run through the monitor. */
  const fired: string[] = [];

  /** Events the force-runs carried (the pressed-first hint rides on `data.priority`). */
  const firedEvents: unknown[] = [];

  const TestSync = Operation.make({
    meta: { key: DXN.make('org.dxos.test.syncTarget.sync'), name: 'Test Sync' },
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
    invokeTrigger: ({ trigger, event }) =>
      Effect.sync(() => {
        fired.push(trigger.id);
        firedEvents.push(event);
      }),
  };

  test('force-runs a legacy per-binding sync trigger', async ({ expect }) => {
    const { target, trigger } = await setup();

    await run(target);

    expect(fired).toEqual([trigger?.id]);
  });

  test('force-runs the account trigger with the pressed binding as priority', async ({ expect }) => {
    const { target, cursor, accountTrigger } = await setup({ legacy: false, account: true });

    await run(target);

    expect(fired).toEqual([accountTrigger?.id]);
    // Pressed-first ordering: the fire event carries the pressed binding for the input template.
    expect(firedEvents).toEqual([{ data: { priority: cursor.id } }]);
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

  const setup = async ({ legacy = true, account = false }: { legacy?: boolean; account?: boolean } = {}) => {
    fired.length = 0;
    firedEvents.length = 0;
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
    const trigger = legacy
      ? db.add(
          Trigger.make({
            enabled: true,
            spec: Trigger.specTimer('*/10 * * * *'),
            input: { binding: Ref.make(cursor) },
          }),
        )
      : undefined;
    const accountTrigger = account
      ? db.add(
          Trigger.make({
            enabled: true,
            spec: Trigger.specTimer('*/10 * * * *'),
            input: { connection: Ref.make(connection), priority: '{{event.data.priority}}' },
          }),
        )
      : undefined;
    await db.flush({ indexes: true });
    return { db, target, cursor, trigger, accountTrigger };
  };

  const run = (target: Obj.Unknown) =>
    syncTarget(target).pipe(
      Effect.provideService(Capability.Service, capabilities()),
      // Never reached: the connector declares a schedule, so the sync goes through the trigger.
      Effect.provide(operationServiceLayerNoop),
      EffectEx.runPromise,
    );
});
