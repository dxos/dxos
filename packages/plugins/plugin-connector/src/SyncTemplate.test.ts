//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, DXN, Filter, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';

import { ConnectorSpec } from '#types';

import * as Binding from './Binding.ts';
import { SyncTemplateScaffoldError } from './errors.ts';
import * as SyncTemplate from './SyncTemplate.ts';

let builder: EchoTestBuilder;

describe('SyncTemplate', () => {
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('stays out of the create picker', async ({ expect }) => {
    expect(SyncTemplate.make(capabilities({ scheduled: true })).hidden).toBe(true);
  });

  test('scaffolds the account routine from a Connection subject', async ({ expect }) => {
    const { db, connection } = await setup();
    const template = SyncTemplate.make(capabilities({ scheduled: true }));

    const routine = await scaffold(template, db, connection);

    const trigger = Binding.triggerOfRoutine(routine);
    expect(trigger?.spec).toEqual({ kind: 'timer', cron: '*/10 * * * *' });
    expect(trigger?.input?.connection).toBeDefined();
  });

  test('resolves a bound target to its connection', async ({ expect }) => {
    const { db, target } = await setup();
    const template = SyncTemplate.make(capabilities({ scheduled: true }));

    // The target's sync affordance passes the Mailbox/Calendar, not the connection.
    const routine = await scaffold(template, db, target);

    expect(Binding.triggerOfRoutine(routine)?.input?.connection).toBeDefined();
  });

  test('passes a supplied name through to the routine', async ({ expect }) => {
    const { db, connection } = await setup();
    const template = SyncTemplate.make(capabilities({ scheduled: true }));

    const routine = await EffectEx.runPromise(
      template.scaffold({ name: 'Nightly sync', subject: connection }).pipe(Effect.provide(Database.layer(db))),
    );

    // Without one, `scaffoldRoutine` names the routine after the account.
    expect(routine.name).toBe('Nightly sync');
  });

  test('fails when there is no subject', async ({ expect }) => {
    const { db } = await setup();
    const template = SyncTemplate.make(capabilities({ scheduled: true }));

    const outcome = await scaffoldResult(template, db, undefined);

    invariant(outcome._tag === 'Failure');
    expect(outcome.failure).toBeInstanceOf(SyncTemplateScaffoldError);
  });

  test('fails when the subject has no connection to sync', async ({ expect }) => {
    const { db } = await setup();
    const template = SyncTemplate.make(capabilities({ scheduled: true }));
    const unbound = db.add(Obj.make(Expando.Expando, { name: 'Unbound' }));
    await db.flush({ indexes: true });

    const outcome = await scaffoldResult(template, db, unbound);

    invariant(outcome._tag === 'Failure');
    expect(outcome.failure).toBeInstanceOf(SyncTemplateScaffoldError);
  });

  test('fails when the connector declares no sync schedule', async ({ expect }) => {
    const { db, connection } = await setup();
    // On-demand-only connector: there is no schedule to wrap in a routine.
    const template = SyncTemplate.make(capabilities({ scheduled: false }));

    const outcome = await scaffoldResult(template, db, connection);

    invariant(outcome._tag === 'Failure');
    expect(outcome.failure).toBeInstanceOf(SyncTemplateScaffoldError);
  });

  test('persists nothing until the caller adds the draft', async ({ expect }) => {
    const { db, connection } = await setup();
    const template = SyncTemplate.make(capabilities({ scheduled: true }));

    await scaffold(template, db, connection);
    await db.flush({ indexes: true });

    // The create dialog is the review step; the draft only lands on Save.
    const routines = await db.query(Filter.type(Routine.Routine)).run();
    expect(routines).toHaveLength(0);
  });
});

/** Seeds a Connection with one bound target, as a connector's bind flow leaves it. */
const setup = async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([
    Connection.Connection,
    Cursor.Cursor,
    AccessToken.AccessToken,
    Routine.Routine,
    Trigger.Trigger,
    Expando.Expando,
  ]);
  const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok' }));
  const connection = db.add(Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }));
  const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
  db.add(Cursor.makeExternal({ source: Ref.make(token), target: Ref.make(target) }));
  await db.flush({ indexes: true });
  return { db, connection, target };
};

const TARGET_TYPENAME = Type.getTypename(Expando.Expando);

const TestSync = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.syncTemplate.sync'), name: 'Test Sync' },
  input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
  output: Schema.Any,
});

/** A connector registry holding one connector, scheduled or on-demand. */
const capabilities = ({ scheduled }: { scheduled: boolean }) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  const connector: ConnectorSpec.ConnectorEntry = {
    id: 'example',
    source: 'example.com',
    sync: {
      operation: TestSync,
      targetTypename: TARGET_TYPENAME,
      ...(scheduled ? { trigger: Trigger.specTimer('*/10 * * * *') } : {}),
    },
  };
  manager.contribute({ module: 'test', interface: ConnectorSpec.Connector, implementation: [connector] });
  return manager;
};

const scaffold = (
  template: ReturnType<typeof SyncTemplate.make>,
  db: Database.Database,
  subject: Obj.Unknown | undefined,
): Promise<Routine.Routine> =>
  EffectEx.runPromise(template.scaffold({ subject }).pipe(Effect.provide(Database.layer(db))));

const scaffoldResult = (
  template: ReturnType<typeof SyncTemplate.make>,
  db: Database.Database,
  subject: Obj.Unknown | undefined,
) => EffectEx.runPromise(template.scaffold({ subject }).pipe(Effect.provide(Database.layer(db)), Effect.result));
