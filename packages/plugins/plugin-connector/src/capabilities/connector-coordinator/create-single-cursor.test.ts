//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, DXN, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { OperationInvoker } from '@dxos/operation';
import { Expando } from '@dxos/schema';

import { ConnectorSpec } from '#types';

import { createSingleCursor } from './create-single-cursor';

describe('createSingleCursor', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Stand-in materialize operation: creates a fresh Expando named after the connection's
  // access-token account (real connectors, e.g. Gmail, materialize a Mailbox the same way).
  const MaterializeExampleTarget = Operation.make({
    meta: { key: DXN.make('com.example.operation.test.createSingleCursor.materialize') },
    input: ConnectorSpec.MaterializeTargetInput,
    output: ConnectorSpec.MaterializeTargetOutput,
  });

  const materializeHandler = MaterializeExampleTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection }) {
        const connectionObj = connection.target;
        invariant(connectionObj, 'connection ref must be hydrated');
        const db = Obj.getDatabase(connectionObj);
        invariant(db, 'connection must live in a database');
        const accessToken = yield* Database.load(connectionObj.accessToken);
        const created = db.add(Obj.make(Expando.Expando, { name: accessToken.account ?? 'Inbox' }));
        return { target: Ref.make(created) };
      }),
    ),
  );

  const invoker = OperationInvoker.make(
    () => Effect.succeed([materializeHandler]),
    ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>,
  );

  // Never invoked here — `ConnectorSync` requires an operation, and this test only exercises
  // target materialization and binding.
  const SyncExampleTarget = Operation.make({
    meta: { key: DXN.make('com.example.operation.test.createSingleCursor.sync') },
    input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
    output: Schema.Any,
  });

  const makeConnector = (overrides: Partial<ConnectorSpec.ConnectorEntry> = {}): ConnectorSpec.ConnectorEntry => ({
    id: 'example',
    source: 'example.com',
    sync: { operation: SyncExampleTarget, materializeTarget: MaterializeExampleTarget },
    ...overrides,
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      Connection.Connection,
      Cursor.Cursor,
      AccessToken.AccessToken,
      Expando.Expando,
      Routine.Routine,
      Trigger.Trigger,
    ]);
    const token = db.add(
      Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok', account: 'me@example.com' }),
    );
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }),
    );
    return { db, connection };
  };

  const queryCursors = (db: Database.Database) =>
    Database.query(Filter.type(Cursor.Cursor)).run.pipe(
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

  test('materializing a target for a new connection creates a bound cursor', async ({ expect }) => {
    const { db, connection } = await setup();

    await createSingleCursor(invoker, db, makeConnector(), connection, undefined).pipe(EffectEx.runAndForwardErrors);

    const cursors = await queryCursors(db);
    expect(cursors).toHaveLength(1);
    invariant(Cursor.isExternal(cursors[0]));
    expect(cursors[0].spec.source.uri).toBe(connection.accessToken.uri);
  });

  test('binding an existingTarget renames it after the connection account', async ({ expect }) => {
    const { db, connection } = await setup();
    const mailbox = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));

    await createSingleCursor(invoker, db, makeConnector(), connection, Ref.make(mailbox)).pipe(
      EffectEx.runAndForwardErrors,
    );

    const cursors = await queryCursors(db);
    expect(cursors).toHaveLength(1);
    expect(Obj.getLabel(mailbox)).toBe('me@example.com');
  });

  test('a declared sync trigger reports needsSyncRoutine without persisting a routine', async ({ expect }) => {
    const { db, connection } = await setup();
    const connector = makeConnector({
      sync: {
        operation: SyncExampleTarget,
        materializeTarget: MaterializeExampleTarget,
        trigger: Trigger.specTimer('0 * * * *'),
      },
    });

    const result = await createSingleCursor(invoker, db, connector, connection, undefined).pipe(
      EffectEx.runAndForwardErrors,
    );

    // The routine is offered through the create-routine form by the caller, never persisted here.
    expect(result?.needsSyncRoutine).toBe(true);
    const routines = await Database.query(Filter.type(Routine.Routine)).run.pipe(
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );
    expect(routines).toHaveLength(0);
  });

  test('no declared sync trigger means no routine is needed', async ({ expect }) => {
    const { db, connection } = await setup();

    const result = await createSingleCursor(invoker, db, makeConnector(), connection, undefined).pipe(
      EffectEx.runAndForwardErrors,
    );

    expect(result?.needsSyncRoutine).toBe(false);
    expect(result?.cursor).toBeDefined();
  });
});
