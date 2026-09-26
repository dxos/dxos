//
// Copyright 2024 DXOS.org
//

import { type Heads, getHeads } from '@automerge/automerge';
import {
  type DocHandle,
  type DocumentId,
  type Message,
  NetworkAdapter,
  type PeerId,
  Repo,
  cbor,
} from '@automerge/automerge-repo';
import { create } from '@bufbuild/protobuf';
import { getRandomPort } from 'get-port-please';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event, Trigger, asyncTimeout, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { EdgeClient, EdgeHttpClient, MessageSchema, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { PublicKey, SpaceId } from '@dxos/keys';
import { LogLevel, type LogProcessor, log } from '@dxos/log';
import {
  EdgeService,
  MESSAGE_TYPE_COLLECTION_QUERY,
  MESSAGE_TYPE_COLLECTION_STATE,
  MESSAGE_TYPE_SUBDUCTION_BATCH,
  MESSAGE_TYPE_SUBDUCTION_CONNECTION,
  MESSAGE_TYPE_SUBDUCTION_FRAME,
  type SubductionConnectionMessage,
  type SubductionProtocolMessageEnveloped,
} from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import { EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import type { Peer } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { openAndClose } from '@dxos/test-utils';
import { compositeKey } from '@dxos/util';

import {
  AutomergeHost,
  type AutomergeReplicatorConnection,
  type AutomergeReplicatorContext,
} from '../automerge/index.ts';
import { findInStates, shutdownRepo } from '../automerge/subduction-test-utils.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
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

  describe('an edit made while the edge is offline', () => {
    test('reaches the edge once it reconnects', { timeout: 30_000 }, async () => {
      const { clientHost, edgeDoc, server, client, admitConnection, lease } = await setupSyncedSpace();
      const syncedHeads = getHeads(edgeDoc.doc());

      await goOffline(client, server, admitConnection);
      const dropped = waitForDroppedSend(
        (type) => type === MESSAGE_TYPE_SUBDUCTION_FRAME || type === MESSAGE_TYPE_SUBDUCTION_BATCH,
      );
      lease.change((doc) => {
        doc.text = 'written offline';
      });
      await dropped;
      const offlineHeads = await getDocHeads(clientHost, lease.documentId);
      expect(offlineHeads).not.toEqual(syncedHeads);
      expect(getHeads(edgeDoc.doc())).toEqual(syncedHeads);

      const converged = waitForHeads(edgeDoc, offlineHeads);
      admitConnection.wake();
      await converged;
      expect(edgeDoc.doc().text).toEqual('written offline');
    });

    test(
      'a collection query dropped while offline is re-issued on the fresh connection',
      { timeout: 30_000 },
      async () => {
        const { clientHost, edge, server, client, admitConnection, lease } = await setupSyncedSpace();
        const collectionId = 'registered-offline';

        const staleSocket = server.currentConnection();
        await goOffline(client, server, admitConnection);
        const droppedQuery = waitForDroppedSend((type) => type === MESSAGE_TYPE_COLLECTION_QUERY);
        await clientHost.updateLocalCollectionState(collectionId, [lease.documentId]);
        await droppedQuery;

        const requeried = edge.waitForCollectionQuery(
          (query) => query.collectionId === collectionId && query.socket !== undefined && query.socket !== staleSocket,
        );
        const answered = waitForRemoteCollectionState(clientHost, collectionId);
        admitConnection.wake();
        await requeried;
        await answered;
      },
    );
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

  const createClientServer = async ({
    gatedAdmission = false,
    messageHandler,
  }: {
    gatedAdmission?: boolean;
    messageHandler?: (payload: SubductionProtocolMessageEnveloped) => Promise<undefined>;
  } = {}) => {
    const admitConnection = new Trigger();
    admitConnection.wake();
    const server = await createTestEdgeWsServer(await getRandomPort(), {
      admitConnection: gatedAdmission ? admitConnection : undefined,
      payloadDecoder: (payload) => cbor.decode(payload),
      messageHandler,
    });
    onTestFinished(server.cleanup);
    const client = new EdgeClient(await createEphemeralEdgeIdentity(), { socketEndpoint: server.endpoint });
    await openAndClose(client);
    return { client, server, admitConnection };
  };

  /** A client host whose document the edge holds, synced over the test edge socket. */
  const setupSyncedSpace = async () => {
    const spaceId = SpaceId.random();
    let edge: TestEdgeSubductionService | undefined;
    const { client, server, admitConnection } = await createClientServer({
      gatedAdmission: true,
      messageHandler: async (payload) => edge?.receive(payload),
    });
    // Opened first: it initializes the subduction WASM module the edge repo also runs on.
    const clientHost = await openHost();
    edge = new TestEdgeSubductionService({ server, client, spaceId });
    const lease = await clientHost.createDoc<{ text: string }>({ text: 'written online' });
    onTestFinished(() => lease[Symbol.dispose]());
    await clientHost.flush(Context.default());
    await clientHost.updateLocalCollectionState('space-documents', [lease.documentId]);

    const bound = new Trigger();
    edge.repo.once('subduction-peer-bound', () => bound.wake());
    const replicator = new EchoEdgeSubductionReplicator({
      edgeConnection: client,
      edgeHttpClient: new EdgeHttpClient(server.endpoint),
      // Space membership is not under test; the host's documents belong to no real space.
      disableSharePolicy: true,
    });
    await clientHost.addReplicator(Context.default(), replicator);
    await replicator.connectToSpace(Context.default(), spaceId);
    await bound.wait({ timeout: SYNC_TIMEOUT_MS });

    // Held open so the edge reports heads for the document and applies what subduction delivers to it.
    const edgeDoc = await findInStates<{ text: string }>(edge.repo, lease.url, ['ready'], { timeout: SYNC_TIMEOUT_MS });
    await waitForHeads(edgeDoc, await getDocHeads(clientHost, lease.documentId));

    return { clientHost, edge, edgeDoc, server, client, admitConnection, lease };
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

const openHost = async (): Promise<AutomergeHost> => {
  const { runtime, dispose } = createTestSqliteRuntime();
  onTestFinished(dispose);
  const host = new AutomergeHost({ runtime, useSubduction: true });
  await host.open();
  onTestFinished(async () => {
    await host.close();
  });
  return host;
};

const getDocHeads = async (host: AutomergeHost, documentId: DocumentId): Promise<Heads | undefined> => {
  const [heads] = await host.getHeads([documentId]);
  return heads;
};

const sameHeads = (left: Heads | undefined, right: Heads | undefined): boolean =>
  left !== undefined && right !== undefined && [...left].sort().join() === [...right].sort().join();

/** Resolves when the handle's document is at exactly `heads`. */
const waitForHeads = async (handle: DocHandle<unknown>, heads: Heads | undefined): Promise<void> => {
  const reached = new Trigger();
  const check = () => {
    if (sameHeads(getHeads(handle.doc()), heads)) {
      reached.wake();
    }
  };
  handle.on('heads-changed', check);
  try {
    check();
    await reached.wait({ timeout: SYNC_TIMEOUT_MS });
  } finally {
    handle.off('heads-changed', check);
  }
};

/** Resolves when `host` records the remote's state for the collection. */
const waitForRemoteCollectionState = async (host: AutomergeHost, collectionId: string): Promise<void> => {
  const received = new Trigger();
  const unsubscribe = host.collectionStateUpdated.on((event) => {
    if (event.collectionId === collectionId && host.getRemoteCollectionStates(collectionId).size > 0) {
      received.wake();
    }
  });
  try {
    await received.wait({ timeout: SYNC_TIMEOUT_MS });
  } finally {
    unsubscribe();
  }
};

/** Resolves when the replicator's offline fast-fail drops an envelope whose type matches. */
const waitForDroppedSend = async (matches: (type: string) => boolean): Promise<void> => {
  const dropped = new Trigger();
  const record: LogProcessor = (_, entry) => {
    const type = entry.context?.type;
    if (
      entry.level === LogLevel.WARN &&
      entry.message === 'dropping message while edge is offline' &&
      typeof type === 'string' &&
      matches(type)
    ) {
      dropped.wake();
    }
  };
  const remove = log.addProcessor(record);
  try {
    await dropped.wait({ timeout: SYNC_TIMEOUT_MS });
  } finally {
    remove();
  }
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

/** Ceiling on a sync wait; every wait resolves on its event, so a healthy run never spends it. */
const SYNC_TIMEOUT_MS = 15_000;

/** Matches the service name `AutomergeHost` registers its subduction adapter under; discovery binds on it. */
const HOST_SUBDUCTION_SERVICE_NAME = 'dxos-subduction';

type TestEdgeWsServer = Awaited<ReturnType<typeof createTestEdgeWsServer>>;

/** A collection query the edge received, and the client socket it arrived on. */
type CollectionQueryRecord = { collectionId: string; socket: ReturnType<TestEdgeWsServer['currentConnection']> };

/**
 * Stands in for the EDGE subduction service: an `accept`-role subduction {@link Repo} behind the test socket.
 *
 * Like the edge, it keys a session by the client's `connectionId` (a new id supersedes the previous
 * session) and answers collection queries with the heads it holds.
 */
class TestEdgeSubductionService extends NetworkAdapter {
  readonly repo: Repo;
  readonly collectionQueried = new Event<CollectionQueryRecord>();
  readonly #server: TestEdgeWsServer;
  readonly #client: EdgeClient;
  readonly #spaceId: SpaceId;
  #session?: { connectionId: string; peerId: PeerId };
  #inbox: Message[] = [];
  #pumping?: Promise<void>;

  constructor({ server, client, spaceId }: { server: TestEdgeWsServer; client: EdgeClient; spaceId: SpaceId }) {
    super();
    this.#server = server;
    this.#client = client;
    this.#spaceId = spaceId;
    this.repo = new Repo({
      network: [],
      subductionAdapters: [{ adapter: this, serviceName: HOST_SUBDUCTION_SERVICE_NAME, role: 'accept' }],
    });
    onTestFinished(() => shutdownRepo(this.repo));
  }

  override isReady(): boolean {
    return true;
  }

  override whenReady(): Promise<void> {
    return Promise.resolve();
  }

  override connect(peerId: PeerId): void {
    this.peerId = peerId;
  }

  override disconnect(): void {
    this.#endSession();
  }

  override send(message: Message): void {
    const session = this.#session;
    if (message.type !== MESSAGE_TYPE_SUBDUCTION_CONNECTION || !message.data || message.targetId !== session?.peerId) {
      return;
    }
    const subductionFrame: SubductionConnectionMessage = {
      type: MESSAGE_TYPE_SUBDUCTION_CONNECTION,
      senderId: message.senderId,
      targetId: message.targetId,
      data: message.data,
    };
    void this.#sendToClient({
      type: MESSAGE_TYPE_SUBDUCTION_FRAME,
      connectionId: session.connectionId,
      subductionFrame,
    });
  }

  waitForCollectionQuery(matches: (query: CollectionQueryRecord) => boolean): Promise<void> {
    return asyncTimeout(this.collectionQueried.waitFor(matches), SYNC_TIMEOUT_MS).then(() => undefined);
  }

  /** Router-socket entry point: one decoded envelope from the client. */
  async receive(envelope: SubductionProtocolMessageEnveloped): Promise<undefined> {
    switch (envelope.type) {
      case MESSAGE_TYPE_SUBDUCTION_FRAME:
        this.#deliverFrames(envelope.connectionId, [envelope.subductionFrame]);
        break;
      case MESSAGE_TYPE_SUBDUCTION_BATCH:
        this.#deliverFrames(envelope.connectionId, envelope.frames);
        break;
      case MESSAGE_TYPE_COLLECTION_QUERY:
        this.collectionQueried.emit({ collectionId: envelope.collectionId, socket: this.#server.currentConnection() });
        await this.#sendToClient({
          type: MESSAGE_TYPE_COLLECTION_STATE,
          senderId: envelope.targetId,
          targetId: envelope.senderId,
          collectionId: envelope.collectionId,
          state: { documents: this.#heldHeads() },
        });
        break;
    }
    return undefined;
  }

  #deliverFrames(connectionId: string, frames: SubductionConnectionMessage[]): void {
    if (frames.length === 0 || !this.peerId) {
      return;
    }
    if (this.#session?.connectionId !== connectionId) {
      this.#endSession();
      this.#session = { connectionId, peerId: frames[0].senderId };
      this.emit('peer-candidate', { peerId: frames[0].senderId, peerMetadata: {} });
    }
    for (const frame of frames) {
      // The client addresses frames to the edge service; the transport accepts only its own peer id.
      this.#inbox.push({ ...frame, targetId: this.peerId });
    }
    this.#pumping ??= this.#pump();
  }

  // The repo attaches a session's transport turns after `peer-candidate`, and the edge's transport queues what arrives first.
  async #pump(): Promise<void> {
    while (this.#inbox.length > 0) {
      await waitForCondition({ condition: () => this.listenerCount('message') > 0, timeout: SYNC_TIMEOUT_MS });
      for (let message = this.#inbox.shift(); message; message = this.#inbox.shift()) {
        this.emit('message', message);
      }
    }
    this.#pumping = undefined;
  }

  #endSession(): void {
    const session = this.#session;
    this.#session = undefined;
    if (session) {
      this.emit('peer-disconnected', { peerId: session.peerId });
    }
  }

  /** Heads of every document the edge holds, as the edge reports them from its sedimentrees. */
  #heldHeads(): Record<string, Heads> {
    return Object.fromEntries(
      Object.values(this.repo.handles)
        .filter((handle) => handle.isReady())
        .map((handle) => [handle.documentId, getHeads(handle.doc())]),
    );
  }

  /** Route a reply to the client, dropping it while the socket is down as the real edge would. */
  async #sendToClient(envelope: SubductionProtocolMessageEnveloped): Promise<void> {
    if (!this.#server.currentConnection()) {
      return;
    }
    await this.#server
      .sendMessage(
        createBuf(MessageSchema, {
          target: [create(PeerSchema, { identityDid: this.#client.identityDid, peerKey: this.#client.peerKey })],
          serviceId: compositeKey(EdgeService.SUBDUCTION_REPLICATOR, this.#spaceId),
          payload: { value: cbor.encode(envelope) },
        }),
      )
      .catch((err) => log.catch(err));
  }
}
