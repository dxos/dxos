//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';
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
    graph.registry.add([Connection.Connection, AccessToken.AccessToken]);
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
});
