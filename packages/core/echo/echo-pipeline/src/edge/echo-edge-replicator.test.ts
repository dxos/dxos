//
// Copyright 2024 DXOS.org
//

import { getRandomPort } from 'get-port-please';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { EdgeClient, type EdgeHttpClient, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { PublicKey, SpaceId } from '@dxos/keys';

import type { AutomergeReplicatorConnection, AutomergeReplicatorContext } from '../automerge';
import { EchoEdgeReplicator } from './echo-edge-replicator';

// TODO(mykola): Expand coverage — end-to-end subduction frame relay tests belong here
// once a full subduction fixture is available.
describe('EchoEdgeReplicator', () => {
  test('opens a subduction connection when connectToSpace is called', async () => {
    const { client } = await createClientServer();

    const spaceId = SpaceId.random();
    const { context, connectionOpen, openConnections } = createMockContext();
    const replicator = await connectReplicator(client, context);

    await replicator.connectToSpace(Context.default(), spaceId);
    await connectionOpen.waitForCount(1);

    expect(openConnections.length).toBe(1);

    await replicator.disconnect();
  });

  const connectReplicator = async (client: EdgeClient, context: AutomergeReplicatorContext) => {
    const replicator = new EchoEdgeReplicator({ edgeConnection: client, edgeHttpClient: {} as EdgeHttpClient });
    await replicator.connect(Context.default(), context);
    onTestFinished(() => replicator.disconnect());
    return replicator;
  };

  const createClientServer = async () => {
    const server = await createTestEdgeWsServer(await getRandomPort());
    onTestFinished(server.cleanup);
    const client = new EdgeClient(await createEphemeralEdgeIdentity(), { socketEndpoint: server.endpoint });
    await openAndClose(client);
    return { client, server };
  };
});

const createMockContext = () => {
  const connectionOpen = new Event();
  const openConnections: AutomergeReplicatorConnection[] = [];
  const context: AutomergeReplicatorContext = {
    getContainingSpaceIdForDocument: async () => null,
    getContainingSpaceForDocument: async () => null,
    onConnectionClosed: (connection) => {
      const idx = openConnections.indexOf(connection);
      if (idx >= 0) {
        openConnections.splice(idx, 1);
      }
    },
    onConnectionOpen: (connection) => {
      openConnections.push(connection);
      connectionOpen.emit();
    },
    peerId: PublicKey.random().toHex(),
  };
  return { context, openConnections, connectionOpen };
};

// Local re-import because vitest's openAndClose is exported from test-utils.
import { openAndClose } from '@dxos/test-utils';
