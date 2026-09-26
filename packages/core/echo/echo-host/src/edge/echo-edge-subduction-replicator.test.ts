//
// Copyright 2024 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';
import { create } from '@bufbuild/protobuf';
import { getRandomPort } from 'get-port-please';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { EdgeClient, type EdgeHttpClient, MessageSchema, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { PublicKey, SpaceId } from '@dxos/keys';
import {
  EdgeService,
  MESSAGE_TYPE_SUBDUCTION_BATCH,
  MESSAGE_TYPE_SUBDUCTION_CONNECTION,
  MESSAGE_TYPE_SUBDUCTION_FRAME,
  type PeerId,
  type SubductionConnectionMessage,
} from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import type { Peer } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { openAndClose } from '@dxos/test-utils';
import { compositeKey } from '@dxos/util';

import type { AutomergeReplicatorConnection, AutomergeReplicatorContext } from '../automerge/index.ts';
import { EchoEdgeSubductionReplicator, MAX_IN_PLACE_REHANDSHAKES } from './echo-edge-subduction-replicator.ts';

describe('EchoEdgeSubductionReplicator', () => {
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
    const { client } = await createClientServer();

    const spaceId = SpaceId.random();

    const { context, connectionOpen } = createMockContext();
    const replicator = await connectReplicator(client, context);

    // Subscribe before connectToSpace so we capture the initial open.
    const waitForFirstOpen = connectionOpen.waitForCount(1);
    await replicator.connectToSpace(Context.default(), spaceId);
    await waitForFirstOpen;

    // setIdentity triggers an async WS reconnect; waitForCount subscribes
    // synchronously so the subscription is in place before the reconnect fires.
    client.setIdentity(await createEphemeralEdgeIdentity());
    await connectionOpen.waitForCount(1);

    // Double reconnect to check for race conditions.
    client.setIdentity(await createEphemeralEdgeIdentity());
    await connectionOpen.waitForCount(1);

    await replicator.disconnect();
  });

  test('an edge error re-handshakes in place, keeping the connection and its peer id', async () => {
    const { client, server } = await createClientServer();

    const spaceId = SpaceId.random();
    const { context, openConnections, connectionOpen, transportResets } = createMockContext();
    const replicator = await connectReplicator(client, context);

    const waitForOpen = connectionOpen.waitForCount(1);
    await replicator.connectToSpace(Context.default(), spaceId);
    await waitForOpen;
    const connection = openConnections[0];
    const peerId = connection.peerId;

    // The edge signals a lost session on this connection lifetime (DX-1275).
    await sendErrorForCurrentConnection(client, server, spaceId, openConnections);
    await waitForCondition({ condition: () => transportResets.length === 1 });

    expect(transportResets[0]).toBe(connection);
    expect(openConnections.length).toBe(1);
    expect(openConnections[0]).toBe(connection);
    expect(openConnections[0].peerId).toBe(peerId);

    await replicator.disconnect();
  });

  test('falls back to a restart once the in-place re-handshake budget is spent', async () => {
    const { client, server } = await createClientServer();

    const spaceId = SpaceId.random();
    const { context, openConnections, connectionOpen, transportResets } = createMockContext();
    const replicator = await connectReplicator(client, context);

    const waitForOpen = connectionOpen.waitForCount(1);
    await replicator.connectToSpace(Context.default(), spaceId);
    await waitForOpen;
    const firstConnection = openConnections[0];

    // No inbound frame ever answers these, so the budget is never refilled.
    for (let attempt = 0; attempt < MAX_IN_PLACE_REHANDSHAKES; attempt++) {
      await sendErrorForCurrentConnection(client, server, spaceId, openConnections);
      await waitForCondition({ condition: () => transportResets.length === attempt + 1 });
    }
    expect(openConnections[0]).toBe(firstConnection);

    // One past the budget: the connection is torn down and replaced, as before DX-1275.
    const waitForReopen = connectionOpen.waitForCount(1);
    await sendErrorForCurrentConnection(client, server, spaceId, openConnections);
    await waitForReopen;

    // The replaced connection's close runs detached, so assert on what the replicator now holds.
    const currentConnection = openConnections[openConnections.length - 1];
    expect(transportResets.length).toBe(MAX_IN_PLACE_REHANDSHAKES);
    expect(currentConnection).not.toBe(firstConnection);
    expect(currentConnection.peerId).not.toBe(firstConnection.peerId);

    await replicator.disconnect();
  });

  // The edge relays replies one router message per frame until the connection has sent it a batch, so a
  // plain-frame handshake would leave a new session's fan-out unbatched.
  test('the handshake ships alone in a batch envelope, also after an in-place re-handshake', async () => {
    const { client, server } = await createClientServer({ payloadDecoder: (payload) => cbor.decode(payload) });

    const spaceId = SpaceId.random();
    const { context, openConnections, connectionOpen, transportResets } = createMockContext();
    const replicator = await connectReplicator(client, context);

    const waitForOpen = connectionOpen.waitForCount(1);
    await replicator.connectToSpace(Context.default(), spaceId);
    await waitForOpen;

    const sendFrame = async (byte: number) => {
      const writer = openConnections[0].writable.getWriter();
      try {
        await writer.write(subductionFrame(byte));
      } finally {
        writer.releaseLock();
      }
    };
    const envelopes = () =>
      server.messageSink.filter(
        (payload) => payload?.type === MESSAGE_TYPE_SUBDUCTION_BATCH || payload?.type === MESSAGE_TYPE_SUBDUCTION_FRAME,
      );

    await sendFrame(1);
    await waitForCondition({ condition: () => envelopes().length === 1 });
    expect(envelopes()[0]).toMatchObject({
      type: MESSAGE_TYPE_SUBDUCTION_BATCH,
      frames: [{ data: new Uint8Array([1]) }],
    });

    await sendErrorForCurrentConnection(client, server, spaceId, openConnections);
    await waitForCondition({ condition: () => transportResets.length === 1 });

    await sendFrame(2);
    await waitForCondition({ condition: () => envelopes().length === 2 });
    expect(envelopes()[1]).toMatchObject({
      type: MESSAGE_TYPE_SUBDUCTION_BATCH,
      frames: [{ data: new Uint8Array([2]) }],
    });

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

  const createClientServer = async (params?: Parameters<typeof createTestEdgeWsServer>[1]) => {
    const server = await createTestEdgeWsServer(await getRandomPort(), params);
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
  const transportResets: AutomergeReplicatorConnection[] = [];
  const context: AutomergeReplicatorContext = {
    getContainingSpaceIdForDocument: async (documentId) => args?.documentSpaceId?.[documentId] ?? null,
    getContainingSpaceForDocument: async () => null,
    isDocumentInRemoteCollection: async (params) =>
      args?.remoteCollections?.[params.peerId]?.[params.documentId] ?? false,
    onConnectionAuthScopeChanged: () => {},
    onConnectionTransportReset: (connection) => {
      transportResets.push(connection);
      return openConnections.includes(connection);
    },
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
  return { context, openConnections, connectionOpen, transportResets };
};

/** Deliver an edge `error` frame carrying the current connection's `_connectionId`, which the client matches before acting. */
const sendErrorForCurrentConnection = async (
  client: EdgeClient,
  server: Awaited<ReturnType<typeof createTestEdgeWsServer>>,
  spaceId: SpaceId,
  openConnections: AutomergeReplicatorConnection[],
): Promise<void> => {
  const connectionId = (openConnections[openConnections.length - 1] as any)._connectionId as string;
  await server.sendMessage(
    createSubductionErrorMessage(
      create(PeerSchema, { identityDid: client.identityDid, peerKey: client.peerKey }),
      spaceId,
      connectionId,
    ),
  );
};

/** A transport frame as automerge-repo hands it to the connection; the byte tells frames apart. */
const subductionFrame = (byte: number): SubductionConnectionMessage => ({
  type: MESSAGE_TYPE_SUBDUCTION_CONNECTION,
  senderId: 'client' as PeerId,
  targetId: 'edge' as PeerId,
  data: new Uint8Array([byte]),
});

const createSubductionErrorMessage = (target: Peer, spaceId: SpaceId, connectionId: string) =>
  createBuf(MessageSchema, {
    target: [target],
    serviceId: compositeKey(EdgeService.SUBDUCTION_REPLICATOR, spaceId),
    payload: {
      value: cbor.encode({ type: 'error', message: 'restart', connectionId }),
    },
  });
