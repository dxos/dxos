//
// Copyright 2024 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';
import { getRandomPort } from 'get-port-please';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { EdgeClient, type EdgeHttpClient, MessageSchema, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { PublicKey, SpaceId } from '@dxos/keys';
import { EdgeService } from '@dxos/protocols';
import type { AutomergeProtocolMessage } from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import type { Peer } from '@dxos/protocols/proto/dxos/edge/messenger';
import { openAndClose } from '@dxos/test-utils';

import type { EchoReplicatorContext, ReplicatorConnection } from '../automerge';

import { EchoEdgeReplicator } from './echo-edge-replicator';

describe('EchoEdgeReplicator', () => {
  test('reconnects', async () => {
    const { client, server } = await createClientServer();

    const spaceId = SpaceId.random();

    const { context, connectionOpen } = createMockContext();
    const replicator = await connectReplicator(client, context);
    await replicator.connectToSpace(spaceId);

    client.setIdentity(await createEphemeralEdgeIdentity());
    await connectionOpen.waitForCount(1);

    const forbidden = createForbiddenMessage({ identityKey: client.identityKey, peerKey: client.peerKey }, spaceId);
    await server.sendMessage(forbidden);
    await connectionOpen.waitForCount(1);

    // Double restart to check for race conditions.
    client.setIdentity(await createEphemeralEdgeIdentity());
    await server.sendMessage(forbidden);
    await connectionOpen.waitForCount(1);

    await replicator.disconnect();
  });

  describe('shouldAdvertise', () => {
    test('true if space document belongs to connection space', async () => {
      const { client } = await createClientServer();

      const spaceId = SpaceId.random();
      const documentId = PublicKey.random().toHex();
      const { context, openConnections } = createMockContext({
        documentSpaceId: { [documentId]: spaceId },
      });
      const replicator = await connectReplicator(client, context);
      await replicator.connectToSpace(spaceId);

      await expect.poll(() => openConnections.length === 1).toBeTruthy();
      expect(openConnections[0].shouldAdvertise({ documentId })).toBeTruthy();
    });

    test('checks remote collection if space id can not be resolved', async () => {
      const { client } = await createClientServer();

      const spaceId = SpaceId.random();
      const documentId = PublicKey.random().toHex();
      const remoteCollections: { [peerId: string]: { [documentId: string]: boolean } } = {};
      const { context, openConnections } = createMockContext({ remoteCollections });
      const replicator = await connectReplicator(client, context);
      await replicator.connectToSpace(spaceId);

      await expect.poll(() => openConnections.length === 1).toBeTruthy();
      const connection = openConnections[0];
      expect(await connection.shouldAdvertise({ documentId })).toBeFalsy();
      remoteCollections[connection.peerId] = { [documentId]: true };
      expect(await connection.shouldAdvertise({ documentId })).toBeTruthy();
    });
  });

  const connectReplicator = async (client: EdgeClient, context: EchoReplicatorContext) => {
    // EdgeHttpClient functionality is not tested here.
    const replicator = new EchoEdgeReplicator({ edgeConnection: client, edgeHttpClient: {} as EdgeHttpClient });
    await replicator.connect(context);
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

const createMockContext = (args?: {
  remoteCollections?: { [peerId: string]: { [documentId: string]: boolean } };
  documentSpaceId?: { [documentId: string]: SpaceId };
}) => {
  const connectionOpen = new Event();
  const openConnections: ReplicatorConnection[] = [];
  return {
    context: {
      getContainingSpaceIdForDocument: async (documentId) => args?.documentSpaceId?.[documentId] ?? null,
      getContainingSpaceForDocument: async (documentId) => null,
      onConnectionAuthScopeChanged: (connection) => {},
      isDocumentInRemoteCollection: async (params) =>
        args?.remoteCollections?.[params.peerId]?.[params.documentId] ?? false,
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
    } satisfies EchoReplicatorContext,

    openConnections,
    connectionOpen,
  };
};

const createForbiddenMessage = (target: Peer, spaceId: SpaceId) =>
  createBuf(MessageSchema, {
    target: [target],
    serviceId: `${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`,
    payload: {
      value: cbor.encode({
        type: 'error',
        message: 'Forbidden',
      } satisfies AutomergeProtocolMessage),
    },
  });
