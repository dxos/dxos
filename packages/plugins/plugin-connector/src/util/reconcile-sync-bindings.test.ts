//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { Database, DXN, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { OperationInvoker } from '@dxos/operation';
import { Expando } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import {
  Connection,
  type ConnectorEntry,
  MaterializeTargetInput,
  MaterializeTargetOutput,
  SyncBinding,
} from '../types';
import { type SyncTargetSelection, reconcileSyncBindings } from './reconcile-sync-bindings';

describe('reconcileSyncBindings', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Stand-in materialize operation: creates a fresh Expando for each
  // newly-selected remote target (real connectors create a Mailbox/Kanban/Project).
  // The handler derives its own Database from the connection ref, matching the
  // production connectors (composer's invoker has no `databaseResolver`).
  const MaterializeExampleTarget = Operation.make({
    meta: { key: DXN.make('org.dxos.test.materializeExampleTarget') },
    input: MaterializeTargetInput,
    output: MaterializeTargetOutput,
  });

  const materializeHandler = MaterializeExampleTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        const connectionObj = connection.target;
        invariant(connectionObj, 'connection ref must be hydrated');
        const db = Obj.getDatabase(connectionObj);
        invariant(db, 'connection must live in a database');
        const created = db.add(Obj.make(Expando.Expando, { name: remoteTarget?.name ?? 'target' }));
        return { target: Ref.make(created) };
      }),
    ),
  );

  // A real invoker resolving the single stand-in handler; no `databaseResolver`,
  // exactly like composer's wiring. The empty runtime's `R = never` is widened to
  // `any` to satisfy `AnyManagedRuntime` (no service requirements in this test).
  const invoker = OperationInvoker.make(
    () => Effect.succeed([materializeHandler]),
    ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>,
  );

  const makeConnector = (overrides: Partial<ConnectorEntry> = {}): ConnectorEntry => ({
    id: 'example',
    source: 'example.com',
    materializeTarget: MaterializeExampleTarget,
    ...overrides,
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Connection.Connection, SyncBinding.SyncBinding, AccessToken.AccessToken, Expando.Expando]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok', account: 'me' }));
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }),
    );
    return { db, connection };
  };

  const reconcile = (
    db: Database.Database,
    connection: Connection.Connection,
    connector: ConnectorEntry,
    selected: ReadonlyArray<SyncTargetSelection>,
    existingTarget?: Ref.Ref<Obj.Unknown>,
  ) =>
    reconcileSyncBindings({ invoker, db, connection, connector, selected, existingTarget }).pipe(
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

  const queryBindings = (db: Database.Database, connection: Connection.Connection) =>
    Database.query(Query.select(Filter.id(connection.id)).sourceOf(SyncBinding.SyncBinding)).run.pipe(
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

  test('materializes a binding for each newly-selected remote target', async ({ expect }) => {
    const { db, connection } = await setup();

    const result = await reconcile(db, connection, makeConnector(), [{ remoteId: 'foo', name: 'Foo' }]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);

    const bindings = await queryBindings(db, connection);
    expect(bindings.length).toBe(1);
    expect(bindings[0].remoteId).toBe('foo');
    expect(bindings[0].name).toBe('Foo');
    // The target was materialized and the relation resolves to it.
    expect(Relation.getTarget(bindings[0])).toBeDefined();
  });

  test('removes bindings that drop out of the new submission', async ({ expect }) => {
    const { db, connection } = await setup();
    await reconcile(db, connection, makeConnector(), [
      { remoteId: 'a', name: 'A' },
      { remoteId: 'b', name: 'B' },
    ]);

    const result = await reconcile(db, connection, makeConnector(), [{ remoteId: 'a', name: 'A' }]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(1);

    const bindings = await queryBindings(db, connection);
    expect(bindings.length).toBe(1);
    expect(bindings[0].remoteId).toBe('a');
  });

  test('preserves an already-bound target (and its sync state) when re-selected', async ({ expect }) => {
    const { db, connection } = await setup();
    const obj = db.add(Obj.make(Expando.Expando, { name: 'kept' }));
    const lastSyncAt = '2026-04-01T00:00:00.000Z';
    const existing = db.add(
      SyncBinding.make({
        [Relation.Source]: connection,
        [Relation.Target]: obj,
        remoteId: 'kept',
        name: 'Kept',
        cursor: 'sentinel',
        lastSyncAt,
      }),
    );

    const result = await reconcile(db, connection, makeConnector(), [{ remoteId: 'kept', name: 'Kept' }]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);

    const bindings = await queryBindings(db, connection);
    expect(bindings.length).toBe(1);
    expect(bindings[0].id).toBe(existing.id);
    expect(bindings[0].cursor).toBe('sentinel');
    expect(bindings[0].lastSyncAt).toBe(lastSyncAt);
    expect(Relation.getTarget(bindings[0]).id).toBe(obj.id);
  });

  test('binds the supplied existingTarget for the first new selection instead of materializing', async ({ expect }) => {
    const { db, connection } = await setup();
    const mailbox = db.add(Obj.make(Expando.Expando, { name: 'existing mailbox' }));

    const result = await reconcile(
      db,
      connection,
      makeConnector(),
      [{ remoteId: 'inbox', name: 'Inbox' }],
      Ref.make(mailbox),
    );
    expect(result.added).toBe(1);

    const bindings = await queryBindings(db, connection);
    expect(bindings.length).toBe(1);
    expect(bindings[0].remoteId).toBe('inbox');
    // The first new selection reuses the caller-supplied object, not a fresh one.
    expect(Relation.getTarget(bindings[0]).id).toBe(mailbox.id);
  });

  test('binds the connection itself for a targetless connector (no materializeTarget)', async ({ expect }) => {
    const { db, connection } = await setup();
    // A targetless connector (e.g. Google Contacts) has no local root type, so
    // the binding is a self-loop: source === target === the connection. The
    // remote target is identified by `remoteId`.
    const connector = makeConnector({ materializeTarget: undefined });

    const result = await reconcile(db, connection, connector, [
      { remoteId: 'contactGroups/myContacts', name: 'My Contacts' },
    ]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);

    const bindings = await queryBindings(db, connection);
    expect(bindings.length).toBe(1);
    expect(bindings[0].remoteId).toBe('contactGroups/myContacts');
    expect(bindings[0].name).toBe('My Contacts');
    expect(Relation.getSource(bindings[0]).id).toBe(connection.id);
    expect(Relation.getTarget(bindings[0]).id).toBe(connection.id);
  });

  test('leaves single-target bindings (no remoteId) untouched on submit', async ({ expect }) => {
    const { db, connection } = await setup();
    // A single-target connector (e.g. Gmail) creates a binding with a target but
    // no remoteId; reconciling remote-id selections must not delete it.
    const auto = db.add(Obj.make(Expando.Expando, { name: 'auto' }));
    db.add(SyncBinding.make({ [Relation.Source]: connection, [Relation.Target]: auto }));

    const result = await reconcile(db, connection, makeConnector(), [{ remoteId: 'new', name: 'New' }]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);

    const bindings = await queryBindings(db, connection);
    expect(bindings.length).toBe(2);
    expect(bindings.find((binding) => binding.remoteId === undefined)).toBeDefined();
    expect(bindings.find((binding) => binding.remoteId === 'new')).toBeDefined();
  });
});
