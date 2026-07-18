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

import { Connection, type ConnectorEntry, MaterializeTargetInput, MaterializeTargetOutput } from '#types';

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
    meta: { key: DXN.make('org.dxos.test.createSingleCursor.materialize') },
    input: MaterializeTargetInput,
    output: MaterializeTargetOutput,
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

  const makeConnector = (overrides: Partial<ConnectorEntry> = {}): ConnectorEntry => ({
    id: 'example',
    source: 'example.com',
    materializeTarget: MaterializeExampleTarget,
    ...overrides,
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Connection.Connection, Cursor.Cursor, AccessToken.AccessToken, Expando.Expando]);
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
});
