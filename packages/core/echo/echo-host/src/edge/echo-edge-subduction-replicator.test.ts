//
// Copyright 2024 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';
import { create } from '@bufbuild/protobuf';
import { getRandomPort } from 'get-port-please';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event, Trigger, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { EdgeClient, type EdgeHttpClient, MessageSchema, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { PublicKey, SpaceId } from '@dxos/keys';
import { LogLevel, type LogProcessor, log } from '@dxos/log';
import {
  EdgeService,
  MESSAGE_TYPE_SUBDUCTION_CONNECTION,
  type PeerId,
  type SubductionConnectionMessage,
} from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import { EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
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

  describe('while the edge is offline', () => {
    test('a send returns promptly and warns instead of erroring', { timeout: 20_000 }, async () => {
      const { client, server, admitConnection } = await createClientServer({ gatedAdmission: true });

      const spaceId = SpaceId.random();
      const { context, connectionOpen, openConnections } = createMockContext();
      const replicator = await connectReplicator(client, context);

      const waitForOpen = connectionOpen.waitForCount(1);
      await replicator.connectToSpace(Context.default(), spaceId);
      await waitForOpen;

      await goOffline(client, server, admitConnection);
      const logs = captureLogs();

      const startedAt = performance.now();
      await writeFrame(openConnections[0]);
      const elapsed = performance.now() - startedAt;

      expect(elapsed).toBeLessThan(1_000);
      expect(logs.filter((entry) => entry.level === LogLevel.ERROR).map((entry) => entry.message)).toEqual([]);
      expect(logs.some((entry) => entry.level === LogLevel.WARN)).toBe(true);
    });

    test('a dropped send is recovered by the fresh connection after reconnect', { timeout: 20_000 }, async () => {
      const { client, server, admitConnection } = await createClientServer({ gatedAdmission: true });

      const spaceId = SpaceId.random();
      const { context, connectionOpen, openConnections } = createMockContext();
      const replicator = await connectReplicator(client, context);

      const waitForOpen = connectionOpen.waitForCount(1);
      await replicator.connectToSpace(Context.default(), spaceId);
      await waitForOpen;
      const staleConnection = openConnections[0];

      await goOffline(client, server, admitConnection);
      const offlineWrite = writeFrame(staleConnection);

      // A blip shorter than the edge client's 10 s send timeout.
      const waitForReopen = connectionOpen.waitForCount(1);
      admitConnection.wake();
      await waitForReopen;
      await offlineWrite;

      // Reopening is the re-sync: `onConnectionOpen` makes the host query every collection on the new peer.
      const freshConnection = openConnections[openConnections.length - 1];
      expect(freshConnection).not.toBe(staleConnection);
      expect(freshConnection.peerId).not.toBe(staleConnection.peerId);

      await writeFrame(freshConnection);
      await waitForCondition({ condition: () => server.messageSink.some(sentOn(freshConnection)) });
      expect(server.messageSink.filter(sentOn(staleConnection))).toEqual([]);

      await replicator.disconnect();
    });
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

  const createClientServer = async ({ gatedAdmission = false }: { gatedAdmission?: boolean } = {}) => {
    const admitConnection = new Trigger();
    admitConnection.wake();
    const server = await createTestEdgeWsServer(await getRandomPort(), {
      admitConnection: gatedAdmission ? admitConnection : undefined,
      payloadDecoder: (payload) => cbor.decode(payload),
    });
    onTestFinished(server.cleanup);
    const client = new EdgeClient(await createEphemeralEdgeIdentity(), { socketEndpoint: server.endpoint });
    await openAndClose(client);
    return { client, server, admitConnection };
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

/** Drop the socket and hold the reconnect at admission, as a device that lost its network. */
const goOffline = async (
  client: EdgeClient,
  server: Awaited<ReturnType<typeof createTestEdgeWsServer>>,
  admitConnection: Trigger,
): Promise<void> => {
  admitConnection.reset();
  await server.closeConnection();
  await waitForCondition({ condition: () => client.status.state !== EdgeStatus_ConnectionState.CONNECTED });
};

/** Push one subduction transport frame through the connection, as automerge-repo's transport would. */
const writeFrame = async (connection: AutomergeReplicatorConnection): Promise<void> => {
  // `PeerId` is a nominal brand with no constructor; the replicator overwrites `targetId` on send anyway.
  const peerId = connection.peerId as PeerId;
  const frame: SubductionConnectionMessage = {
    type: MESSAGE_TYPE_SUBDUCTION_CONNECTION,
    senderId: peerId,
    targetId: peerId,
    data: new Uint8Array([1, 2, 3]),
  };
  const writer = connection.writable.getWriter();
  try {
    await writer.write(frame);
  } finally {
    writer.releaseLock();
  }
};

/** Matches envelopes carrying the connection's `connectionId`, which is the suffix of its peer id. */
const sentOn =
  (connection: AutomergeReplicatorConnection) =>
  (payload: { connectionId?: string }): boolean =>
    payload.connectionId !== undefined && connection.peerId.endsWith(`-${payload.connectionId}`);

const captureLogs = () => {
  const entries: { level: LogLevel; message?: string }[] = [];
  const record: LogProcessor = (_, entry) => {
    entries.push({ level: entry.level, message: entry.message });
  };
  onTestFinished(log.addProcessor(record));
  return entries;
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

const createSubductionErrorMessage = (target: Peer, spaceId: SpaceId, connectionId: string) =>
  createBuf(MessageSchema, {
    target: [target],
    serviceId: compositeKey(EdgeService.SUBDUCTION_REPLICATOR, spaceId),
    payload: {
      value: cbor.encode({ type: 'error', message: 'restart', connectionId }),
    },
  });
