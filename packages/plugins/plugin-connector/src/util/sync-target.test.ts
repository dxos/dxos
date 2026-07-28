//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Capabilities, Capability, CapabilityManager } from '@dxos/app-framework';
import { Operation, ServiceResolver, Trigger } from '@dxos/compute';
import { Database, DXN, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';

import { Connection, Connector, type ConnectorEntry } from '#types';

import { syncTarget } from './sync-target';
import { findSyncTrigger } from './sync-trigger';

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

  const TestSync = Operation.make({
    meta: { key: DXN.make('org.dxos.test.syncTarget.sync') },
    input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
    output: Schema.Any,
  });

  const connector: ConnectorEntry = { id: 'example', source: 'example.com', sync: TestSync };

  const recordingMonitor: Trigger.Monitor = {
    triggers: Atom.make<readonly Trigger.State[]>([]),
    localDispatcherEnabled: false,
    invokeTrigger: ({ trigger }) => Effect.sync(() => void fired.push(trigger.id)),
  };

  const capabilities = () => {
    const manager = CapabilityManager.make({ registry: Registry.make() });
    manager.contribute({ module: 'test', interface: Connector, implementation: [connector] });
    manager.contribute({
      module: 'test',
      interface: Capabilities.ServiceResolver,
      implementation: ServiceResolver.fromContext(Context.make(Trigger.TriggerMonitorService, recordingMonitor)),
    });
    return manager;
  };

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

  test('finds the target’s sync trigger through its binding cursor', async ({ expect }) => {
    const { db, target, trigger } = await setup();

    const found = await findSyncTrigger(target).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);

    expect(found?.id).toBe(trigger.id);
  });

  test('force-runs the target’s sync trigger', async ({ expect }) => {
    fired.length = 0;
    const { target, trigger } = await setup();

    await syncTarget(target).pipe(Effect.provideService(Capability.Service, capabilities()), EffectEx.runPromise);

    expect(fired).toEqual([trigger.id]);
  });
});
