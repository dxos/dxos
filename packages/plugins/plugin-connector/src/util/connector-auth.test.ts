//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { DXN, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Cursor } from '@dxos/link';
import { Node } from '@dxos/plugin-graph';
import { OAuthProvider } from '@dxos/protocols';

import { Connection, type ConnectorEntry } from '../types';
import { connectorAuthActions } from './connector-auth';

// A connector is "offered" (gets a Connect entry) when it has an auth flow; oauth is the simplest.
const authFlow: Partial<ConnectorEntry> = { oauth: { provider: OAuthProvider.GOOGLE, scopes: [] } };

const TestSync = Operation.make({
  meta: { key: DXN.make('org.dxos.test.connectorAuth.sync'), name: 'Test Sync' },
  input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
  output: Schema.Any,
});

/** A connector that keeps its bindings on a schedule, so reuse sets a sync Routine up for them. */
const scheduledSync: Partial<ConnectorEntry> = {
  sync: { operation: TestSync, trigger: Trigger.specTimer('*/10 * * * *') },
};

const makeConnector = (id: string, extra: Partial<ConnectorEntry> = {}): ConnectorEntry => ({
  id,
  source: `${id}.example`,
  label: id.toUpperCase(),
  ...extra,
});

describe('connectorAuthActions', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      Connection.Connection,
      AccessToken.AccessToken,
      Cursor.Cursor,
      Trigger.Trigger,
      Routine.Routine,
    ]);
    const addConnection = (connectorId: string) => {
      const token = db.add(Obj.make(AccessToken.AccessToken, { source: `${connectorId}.example`, token: 'tok' }));
      return db.add(Obj.make(Connection.Connection, { connectorId, accessToken: Ref.make(token) }));
    };
    return { db, addConnection };
  };

  test('returns nothing when there is no auth flow and nothing to reuse', async ({ expect }) => {
    const { db } = await setup();
    const actions = connectorAuthActions({
      connectorIds: ['a'],
      db,
      spaceId: db.spaceId,
      allConnectors: [makeConnector('a')],
      allConnections: [],
    });
    expect(actions).toEqual([]);
  });

  test('always produces a single dropdown group', async ({ expect }) => {
    const { db } = await setup();
    const actions = connectorAuthActions({
      connectorIds: ['a', 'b'],
      db,
      spaceId: db.spaceId,
      allConnectors: [makeConnector('a', authFlow), makeConnector('b', authFlow)],
      allConnections: [],
    });
    expect(actions).toHaveLength(1);
    const group = actions[0];
    expect(group.type).toBe(Node.ActionGroupType);
    expect(group.actions?.map((action) => action.id)).toEqual(['connect-a', 'connect-b']);
  });

  test('reuse and connect sections are separated inside the group', async ({ expect }) => {
    const { db, addConnection } = await setup();
    const connection = addConnection('b');
    // Reuse binds a target, so an `existingTarget` is required for reuse entries to appear.
    const target = db.add(Obj.make(AccessToken.AccessToken, { source: 'target.example', token: 'tok' }));
    const actions = connectorAuthActions({
      connectorIds: ['a', 'b'],
      db,
      spaceId: db.spaceId,
      existingTarget: Ref.make(target),
      allConnectors: [makeConnector('a', authFlow), makeConnector('b', authFlow)],
      allConnections: [connection],
    });
    const group = actions[0];
    expect(group.actions?.map((action) => action.id)).toEqual([
      `reuse-${connection.id}`,
      'connectorAuth-separator',
      'connect-a',
      'connect-b',
    ]);
  });

  test('reuse binds a cursor to the existing target and sets its sync routine up', async ({ expect }) => {
    const { db, addConnection } = await setup();
    const connection = addConnection('b');
    const target = db.add(Obj.make(AccessToken.AccessToken, { source: 'target.example', token: 'tok' }));
    const connector: ConnectorEntry = makeConnector('b', scheduledSync);

    const actions = connectorAuthActions({
      connectorIds: ['b'],
      db,
      spaceId: db.spaceId,
      existingTarget: Ref.make(target),
      allConnectors: [connector],
      allConnections: [connection],
    });
    const [reuse] = actions[0].actions ?? [];
    invariant(Node.isAction(reuse));
    await EffectEx.runAndForwardErrors(reuse.data());

    const cursors = await db.query(Filter.type(Cursor.Cursor)).run();
    expect(cursors).toHaveLength(1);
    expect(cursors[0].spec.kind).toBe('external');

    // The connector declares a schedule, so the new binding gets a trigger bound to it.
    const triggers = await db.query(Filter.type(Trigger.Trigger)).run();
    expect(triggers).toHaveLength(1);
    expect(triggers[0].input?.binding?.uri).toBe(Ref.make(cursors[0]).uri);
  });

  test('reuse renames the existing target after the connection account', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      Connection.Connection,
      AccessToken.AccessToken,
      Cursor.Cursor,
      Trigger.Trigger,
      Routine.Routine,
      Operation.PersistentOperation,
    ]);
    const token = db.add(
      Obj.make(AccessToken.AccessToken, { source: 'b.example', token: 'tok', account: 'me@example.com' }),
    );
    const connection = db.add(Obj.make(Connection.Connection, { connectorId: 'b', accessToken: Ref.make(token) }));
    const target = db.add(Obj.make(AccessToken.AccessToken, { source: 'target.example', token: 'tok' }));
    const connector: ConnectorEntry = makeConnector('b');

    const actions = connectorAuthActions({
      connectorIds: ['b'],
      db,
      spaceId: db.spaceId,
      existingTarget: Ref.make(target),
      allConnectors: [connector],
      allConnections: [connection],
    });
    const [reuse] = actions[0].actions ?? [];
    invariant(Node.isAction(reuse));
    await EffectEx.runAndForwardErrors(reuse.data());

    expect(Obj.getLabel(target)).toBe('me@example.com');
  });
});
