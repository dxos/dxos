//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
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
    graph.registry.add([Connection.Connection, AccessToken.AccessToken, Cursor.Cursor]);
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

  test('reuse binds a cursor to the existing target and fires onCursorCreated', async ({ expect }) => {
    const { db, addConnection } = await setup();
    const connection = addConnection('b');
    const target = db.add(Obj.make(AccessToken.AccessToken, { source: 'target.example', token: 'tok' }));
    const onCursorCreated = vi.fn(
      (_input: Parameters<NonNullable<ConnectorEntry['onCursorCreated']>>[0]) => Effect.void,
    );
    const connector: ConnectorEntry = makeConnector('b', { onCursorCreated });

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

    expect(onCursorCreated).toHaveBeenCalledTimes(1);
    const [input] = onCursorCreated.mock.calls[0];
    expect(input.connection.id).toBe(connection.id);
    expect(input.target.id).toBe(target.id);
    expect(input.cursor.id).toBe(cursors[0].id);
  });
});
