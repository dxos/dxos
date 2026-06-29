//
// Copyright 2024 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';
import { getRandomPort } from 'get-port-please';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type EdgeHttpClient, EdgeClient, MessageSchema, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { PublicKey, SpaceId } from '@dxos/keys';
import { EdgeService } from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import type { Peer } from '@dxos/protocols/proto/dxos/edge/messenger';
import { openAndClose } from '@dxos/test-utils';
import { compositeKey } from '@dxos/util';

import type { AutomergeReplicatorConnection, AutomergeReplicatorContext } from '../automerge';
import { EchoEdgeSubductionReplicator } from './echo-edge-subduction-replicator';

// TODO(mykola): subduction wasm/network tests are flaky on CI runners
// (limited concurrency, signal-server timing). Re-enable once the suite
// is stable in CI.
describe.skipIf(process.env.CI)('EchoEdgeSubductionReplicator', () => {
  test('opens a subduction connection when connectToSpace is called', async () => {
    const { client } = await createClientServer();

    const spaceId = SpaceId.random();
    const { context, connectionOpen, openConnections } = createMockContext();
    const replicator = await connectReplicator(client, context);

    // Subscribe before connectToSpace: onConnectionOpen fires synchronously during open().
    const waitForOpen = connectionOpen.waitForCount(1);
    await replicator.connectToSpace(Context.default(), spaceId);
    await waitForOpen;

    expect(openConnections.length).toBe(1);

    await replicator.disconnect();
  });

  test('reconnects', async () => {
    const { client, server } = await createClientServer();

    const spaceId = SpaceId.random();

    const { context, openConnections, connectionOpen } = createMockContext();
    const replicator = await connectReplicator(client, context);

    // Subscribe before connectToSpace so we capture the initial open.
    const waitForFirstOpen = connectionOpen.waitForCount(1);
    await replicator.connectToSpace(Context.default(), spaceId);
    await waitForFirstOpen;

    // setIdentity triggers an async WS reconnect; waitForCount subscribes
    // synchronously so the subscription is in place before the reconnect fires.
    client.setIdentity(await createEphemeralEdgeIdentity());
    await connectionOpen.waitForCount(1);

    // Subduction-era restart: edge emits an `error` frame on the SUBDUCTION_REPLICATOR
    // service id carrying the client's current `connectionId`; the connection tears
    // down and the replicator opens a fresh connection on the next mutex pass. The
    // current connection lives at the tail of `openConnections` — extract its
    // `_connectionId` (private but visible to the same-package test) so the frame
    // matches the client-side restart guard.
    const currentConnectionId = () => (openConnections[openConnections.length - 1] as any)._connectionId as string;
    await server.sendMessage(
      createSubductionErrorMessage(
        { identityKey: client.identityKey, peerKey: client.peerKey },
        spaceId,
        currentConnectionId(),
      ),
    );
    await connectionOpen.waitForCount(1);

    // Double restart to check for race conditions. The error frame must carry the
    // current connection's `_connectionId` after `setIdentity` finishes reconnecting,
    // so wait for the post-`setIdentity` open before constructing it.
    client.setIdentity(await createEphemeralEdgeIdentity());
    await connectionOpen.waitForCount(1);
    await server.sendMessage(
      createSubductionErrorMessage(
        { identityKey: client.identityKey, peerKey: client.peerKey },
        spaceId,
        currentConnectionId(),
      ),
    );
    await connectionOpen.waitForCount(1);

    await replicator.disconnect();
  });

  describe('shouldAdvertise', () => {
    test('true if space document belongs to connection space', async () => {
      const { client } = await createClientServer();

      const spaceId = SpaceId.random();
      const documentId = PublicKey.random().toHex();
      const { context, openConnections, connectionOpen } = createMockContext({
        documentSpaceId: { [documentId]: spaceId },
      });
      const replicator = await connectReplicator(client, context);

      // Subscribe before connectToSpace so we capture the synchronous open event.
      const waitForOpen = connectionOpen.waitForCount(1);
      await replicator.connectToSpace(Context.default(), spaceId);
      await waitForOpen;

      expect(openConnections.length).toBe(1);
      expect(await openConnections[0].shouldAdvertise({ documentId })).toBeTruthy();
    });

    test('checks remote collection if space id can not be resolved', async () => {
      const { client } = await createClientServer();

      const spaceId = SpaceId.random();
      const documentId = PublicKey.random().toHex();
      const remoteCollections: { [peerId: string]: { [documentId: string]: boolean } } = {};
      const { context, openConnections, connectionOpen } = createMockContext({ remoteCollections });
      const replicator = await connectReplicator(client, context);

      // Subscribe before connectToSpace so we capture the synchronous open event.
      const waitForOpen = connectionOpen.waitForCount(1);
      await replicator.connectToSpace(Context.default(), spaceId);
      await waitForOpen;

      const connection = openConnections[0];
      expect(await connection.shouldAdvertise({ documentId })).toBeFalsy();
      remoteCollections[connection.peerId] = { [documentId]: true };
      expect(await connection.shouldAdvertise({ documentId })).toBeTruthy();
    });
  });

  const connectReplicator = async (client: EdgeClient, context: AutomergeReplicatorContext) => {
    // EdgeHttpClient functionality is not used by the subduction replicator.
    const replicator = new EchoEdgeSubductionReplicator({
      edgeConnection: client,
      edgeHttpClient: {} as EdgeHttpClient,
    });
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

const createMockContext = (args?: {
  remoteCollections?: { [peerId: string]: { [documentId: string]: boolean } };
  documentSpaceId?: { [documentId: string]: SpaceId };
}) => {
  const connectionOpen = new Event();
  const openConnections: AutomergeReplicatorConnection[] = [];
  const context: AutomergeReplicatorContext = {
    getContainingSpaceIdForDocument: async (documentId) => args?.documentSpaceId?.[documentId] ?? null,
    getContainingSpaceForDocument: async () => null,
    isDocumentInRemoteCollection: async (params) =>
      args?.remoteCollections?.[params.peerId]?.[params.documentId] ?? false,
    onConnectionAuthScopeChanged: () => {},
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

const createSubductionErrorMessage = (target: Peer, spaceId: SpaceId, connectionId: string) =>
  createBuf(MessageSchema, {
    target: [target],
    serviceId: compositeKey(EdgeService.SUBDUCTION_REPLICATOR, spaceId),
    payload: {
      value: cbor.encode({ type: 'error', message: 'restart', connectionId }),
    },
  });
