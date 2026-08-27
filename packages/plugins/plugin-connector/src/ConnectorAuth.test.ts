//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { DXN, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { OAuthProvider } from '@dxos/protocols';

import { ConnectorSpec } from '#types';

import * as ConnectorAuth from './ConnectorAuth';

// A connector is "offered" (gets a Connect entry) when it has an auth flow; oauth is the simplest.
const authFlow: Partial<ConnectorSpec.ConnectorEntry> = { oauth: { provider: OAuthProvider.GOOGLE, scopes: [] } };

const TestSync = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.connectorAuth.sync'), name: 'Test Sync' },
  input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
  output: Schema.Any,
});

/** A connector that keeps its bindings on a schedule, so reuse sets a sync Routine up for them. */
const scheduledSync: Partial<ConnectorSpec.ConnectorEntry> = {
  sync: { operation: TestSync, trigger: Trigger.specTimer('*/10 * * * *') },
};

const makeConnector = (
  id: string,
  extra: Partial<ConnectorSpec.ConnectorEntry> = {},
): ConnectorSpec.ConnectorEntry => ({
  id,
  source: `${id}.example`,
  label: id.toUpperCase(),
  ...extra,
});

describe('ConnectorAuth.actions', () => {
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
    const actions = ConnectorAuth.actions({
      connectorIds: ['a'],
      db,
      spaceId: db.spaceId,
      allConnectors: [makeConnector('a')],
      allConnections: [],
    });
    expect(actions).toEqual([]);
  });

  test('the unavailable form is a disabled, empty Connect group', async ({ expect }) => {
    // What a bindable object's toolbar falls back to, so Connect is always present as an affordance
    // even where the case above has nothing to offer.
    const [group] = ConnectorAuth.unavailableActions();

    expect(group.type).toBe(AppGraphNode.ActionGroupType);
    expect(group.id).toBe(ConnectorAuth.GROUP_ID);
    expect(group.properties?.disabled).toBe(true);
    expect(group.actions).toEqual([]);
    // Ghost, so it reads as unavailable next to the live group's primary trigger.
  });

  test('the live group renders as a primary trigger', async ({ expect }) => {
    const { db } = await setup();
    const actions = ConnectorAuth.actions({
      connectorIds: ['a'],
      db,
      spaceId: db.spaceId,
      allConnectors: [makeConnector('a', authFlow)],
      allConnections: [],
    });

    // Connecting is the call to action on an unbound object; ghost styling read as disabled.
    // Explicitly `false`, not absent: the graph merges a node's properties over the previous
    // generation's, so only an emitted key can clear an earlier disabled placeholder.
    expect(actions[0].properties?.disabled).toBe(false);
  });

  test('always produces a single dropdown group', async ({ expect }) => {
    const { db } = await setup();
    const actions = ConnectorAuth.actions({
      connectorIds: ['a', 'b'],
      db,
      spaceId: db.spaceId,
      allConnectors: [makeConnector('a', authFlow), makeConnector('b', authFlow)],
      allConnections: [],
    });
    expect(actions).toHaveLength(1);
    const group = actions[0];
    expect(group.type).toBe(AppGraphNode.ActionGroupType);
    expect(group.actions?.map((action) => action.id)).toEqual(['connect-a', 'connect-b']);
  });

  test('reuse and connect sections are separated inside the group', async ({ expect }) => {
    const { db, addConnection } = await setup();
    const connection = addConnection('b');
    // Reuse binds a target, so an `existingTarget` is required for reuse entries to appear.
    const target = db.add(Obj.make(AccessToken.AccessToken, { source: 'target.example', token: 'tok' }));
    const actions = ConnectorAuth.actions({
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

  test('reuse binds a cursor to the existing target without creating a routine', async ({ expect }) => {
    const { db, addConnection } = await setup();
    const connection = addConnection('b');
    const target = db.add(Obj.make(AccessToken.AccessToken, { source: 'target.example', token: 'tok' }));
    const connector: ConnectorSpec.ConnectorEntry = makeConnector('b', scheduledSync);

    const actions = ConnectorAuth.actions({
      connectorIds: ['b'],
      db,
      spaceId: db.spaceId,
      existingTarget: Ref.make(target),
      allConnectors: [connector],
      allConnections: [connection],
    });
    const [reuse] = actions[0].actions ?? [];
    invariant(AppGraphNode.isAction(reuse));
    await EffectEx.runAndForwardErrors(reuse.data());

    const cursors = await db.query(Filter.type(Cursor.Cursor)).run();
    expect(cursors).toHaveLength(1);
    expect(cursors[0].spec.kind).toBe('external');

    // The new binding is covered by the account's routine (its fan-out queries the cursors at run
    // time); no trigger is persisted at bind time — the routine is offered through the create-routine
    // form by the target's own sync affordance when the account has none.
    const triggers = await db.query(Filter.type(Trigger.Trigger)).run();
    expect(triggers).toHaveLength(0);
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
    const connector: ConnectorSpec.ConnectorEntry = makeConnector('b');

    const actions = ConnectorAuth.actions({
      connectorIds: ['b'],
      db,
      spaceId: db.spaceId,
      existingTarget: Ref.make(target),
      allConnectors: [connector],
      allConnections: [connection],
    });
    const [reuse] = actions[0].actions ?? [];
    invariant(AppGraphNode.isAction(reuse));
    await EffectEx.runAndForwardErrors(reuse.data());

    expect(Obj.getLabel(target)).toBe('me@example.com');
  });
});
