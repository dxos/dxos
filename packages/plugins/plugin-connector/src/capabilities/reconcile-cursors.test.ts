//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { Database, DXN, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Cursor } from '@dxos/link';
import { OperationInvoker } from '@dxos/operation';
import { Expando } from '@dxos/schema';

import { Connection, type ConnectorEntry, MaterializeTargetInput, MaterializeTargetOutput } from '../types';
import { isCursorForConnection } from '../util';
import { type SyncTargetSelection, reconcileCursors } from './connector-coordinator';

describe('reconcileCursors', () => {
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
    graph.registry.add([Connection.Connection, Cursor.Cursor, AccessToken.AccessToken, Expando.Expando]);
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
    reconcileCursors({ invoker, db, connection, connector, selected, existingTarget }).pipe(
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

  const queryCursors = (db: Database.Database, connection: Connection.Connection) =>
    Database.query(Filter.type(Cursor.Cursor)).run.pipe(
      Effect.provide(Database.layer(db)),
      Effect.map((cursors) => cursors.filter((cursor) => isCursorForConnection(cursor, connection))),
      EffectEx.runAndForwardErrors,
    );

  const loadTarget = (db: Database.Database, target: Ref.Ref<Obj.Unknown>) =>
    Database.load(target).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

  test('materializes a cursor for each newly-selected remote target', async ({ expect }) => {
    const { db, connection } = await setup();

    const result = await reconcile(db, connection, makeConnector(), [{ externalId: 'foo', name: 'Foo' }]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);

    const cursors = await queryCursors(db, connection);
    expect(cursors.length).toBe(1);
    const [cursor] = cursors;
    invariant(Cursor.isExternal(cursor));
    expect(cursor.spec.externalId).toBe('foo');
    expect(cursor.spec.label).toBe('Foo');
    // The target was materialized and the ref resolves to it.
    expect(await loadTarget(db, cursor.spec.target)).toBeDefined();
  });

  test('removes cursors that drop out of the new submission', async ({ expect }) => {
    const { db, connection } = await setup();
    await reconcile(db, connection, makeConnector(), [
      { externalId: 'a', name: 'A' },
      { externalId: 'b', name: 'B' },
    ]);

    const result = await reconcile(db, connection, makeConnector(), [{ externalId: 'a', name: 'A' }]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(1);

    const cursors = await queryCursors(db, connection);
    expect(cursors.length).toBe(1);
    invariant(Cursor.isExternal(cursors[0]));
    expect(cursors[0].spec.externalId).toBe('a');
  });

  test('preserves an already-bound target (and its sync state) when re-selected', async ({ expect }) => {
    const { db, connection } = await setup();
    const obj = db.add(Obj.make(Expando.Expando, { name: 'kept' }));
    const lastTick = '2026-04-01T00:00:00.000Z';
    const existing = db.add(
      Cursor.makeExternal({
        source: connection.accessToken,
        target: Ref.make(obj),
        externalId: 'kept',
        label: 'Kept',
        value: 'sentinel',
      }),
    );
    Obj.update(existing, (existing) => {
      existing.lastTick = lastTick;
    });

    const result = await reconcile(db, connection, makeConnector(), [{ externalId: 'kept', name: 'Kept' }]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);

    const cursors = await queryCursors(db, connection);
    expect(cursors.length).toBe(1);
    expect(cursors[0].id).toBe(existing.id);
    expect(cursors[0].value).toBe('sentinel');
    expect(cursors[0].lastTick).toBe(lastTick);
    invariant(Cursor.isExternal(cursors[0]));
    const target = await loadTarget(db, cursors[0].spec.target);
    expect(target.id).toBe(obj.id);
  });

  test('binds the supplied existingTarget for the first new selection instead of materializing', async ({ expect }) => {
    const { db, connection } = await setup();
    const mailbox = db.add(Obj.make(Expando.Expando, { name: 'existing mailbox' }));

    const result = await reconcile(
      db,
      connection,
      makeConnector(),
      [{ externalId: 'inbox', name: 'Inbox' }],
      Ref.make(mailbox),
    );
    expect(result.added).toBe(1);

    const cursors = await queryCursors(db, connection);
    expect(cursors.length).toBe(1);
    invariant(Cursor.isExternal(cursors[0]));
    expect(cursors[0].spec.externalId).toBe('inbox');
    // The first new selection reuses the caller-supplied object, not a fresh one.
    const target = await loadTarget(db, cursors[0].spec.target);
    expect(target.id).toBe(mailbox.id);
  });

  test('binds the connection itself for a targetless connector (no materializeTarget)', async ({ expect }) => {
    const { db, connection } = await setup();
    // A targetless connector (e.g. Google Contacts) has no local root type, so the cursor's target is
    // the connection itself. The remote target is identified by `externalId`.
    const connector = makeConnector({ materializeTarget: undefined });

    const result = await reconcile(db, connection, connector, [
      { externalId: 'contactGroups/myContacts', name: 'My Contacts' },
    ]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);

    const cursors = await queryCursors(db, connection);
    expect(cursors.length).toBe(1);
    invariant(Cursor.isExternal(cursors[0]));
    expect(cursors[0].spec.externalId).toBe('contactGroups/myContacts');
    expect(cursors[0].spec.label).toBe('My Contacts');
    const target = await loadTarget(db, cursors[0].spec.target);
    expect(target.id).toBe(connection.id);
  });

  test('leaves single-target cursors (no externalId) untouched on submit', async ({ expect }) => {
    const { db, connection } = await setup();
    // A single-target connector (e.g. Gmail) creates a cursor with a target but no externalId;
    // reconciling remote-id selections must not delete it.
    const auto = db.add(Obj.make(Expando.Expando, { name: 'auto' }));
    db.add(Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(auto) }));

    const result = await reconcile(db, connection, makeConnector(), [{ externalId: 'new', name: 'New' }]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);

    const cursors = await queryCursors(db, connection);
    expect(cursors.length).toBe(2);
    expect(cursors.some((cursor) => Cursor.isExternal(cursor) && cursor.spec.externalId === undefined)).toBe(true);
    expect(cursors.some((cursor) => Cursor.isExternal(cursor) && cursor.spec.externalId === 'new')).toBe(true);
  });
});
