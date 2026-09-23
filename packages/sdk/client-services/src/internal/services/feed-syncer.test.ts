//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { Encoder, decode as cborDecode } from 'cbor-x';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type EdgeConnection, MessageSchema, type ReconnectListener } from '@dxos/edge-client';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore, SyncServer } from '@dxos/feed';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { EdgeService } from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import { EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { EdgeStatusSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Message as RouterMessage } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import { bufferToArray } from '@dxos/util';

import { FeedSyncer } from './feed-syncer.ts';

type ProtocolMessage = FeedProtocol.ProtocolMessage;

const encoder = new Encoder({ tagUint8Array: false, useRecords: false });
/** Timers measured with `Date.now()` can read a few milliseconds short of their scheduled delay. */
const TIMER_SLACK_MS = 10;
const syncNamespace = FeedProtocol.WellKnownNamespaces.data;
const syncNamespaces = [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace];

const createRuntime = () => {
  const baseLayer = layerMemory;
  const transactionLayer = baseLayer;
  return ManagedRuntime.make(Layer.merge(baseLayer, transactionLayer).pipe(Layer.orDie));
};

const createFeedStore = (localActorId: string, assignPositions: boolean) =>
  new FeedStore({ localActorId, assignPositions });

const createEdgeConnection = ({
  syncServer,
  serverRuntime,
  messageListeners,
  sentMessages,
  interceptRequest,
}: {
  syncServer: SyncServer;
  serverRuntime: ReturnType<typeof createRuntime>;
  messageListeners: Set<(message: RouterMessage) => void>;
  sentMessages: ProtocolMessage[];
  /** Answers a request in place of the server when it returns a message. */
  interceptRequest?: (message: ProtocolMessage) => ProtocolMessage | undefined;
}): EdgeConnection & { reconnect: () => void } => {
  const reconnectListeners = new Set<ReconnectListener>();
  const deliver = (message: ProtocolMessage) => {
    const routerMessage = createBuf(MessageSchema, {
      source: { identityKey: 'server-identity', peerKey: 'server-peer' },
      serviceId: `${EdgeService.QUEUE_REPLICATOR}:test`,
      payload: { value: bufferToArray(encoder.encode(message)) },
    });
    for (const listener of messageListeners) {
      listener(routerMessage);
    }
  };

  return {
    statusChanged: new Event<any>(),
    info: {},
    identityDid: 'did:halo:client-identity',
    peerKey: 'client-peer',
    isOpen: true,
    status: create(EdgeStatusSchema, {
      state: EdgeStatus_ConnectionState.CONNECTED,
      rtt: 0,
      uptime: 0,
      rateBytesUp: 0,
      rateBytesDown: 0,
      messagesSent: 0,
      messagesReceived: 0,
    }),
    setIdentity: () => {},
    // Reports CONNECTED above, so the syncer's initial round runs without waiting for a dial.
    startNetworking: () => {},
    open: async () => {},
    close: async () => {},
    send: async (ctx, routerMessage: RouterMessage) => {
      const decoded = cborDecode(routerMessage.payload!.value) as ProtocolMessage;
      sentMessages.push(decoded);
      // `SyncServer` knows only the request/response RPCs; a subscribe would fall through it.
      if (decoded._tag === 'SubscribeRequest') {
        return;
      }
      const intercepted = interceptRequest?.(decoded);
      if (intercepted) {
        deliver(intercepted);
        return;
      }
      await syncServer.handleMessage(ctx, decoded).pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));
    },
    onMessage: (listener: (message: RouterMessage) => void) => {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    onReconnected: (listener: ReconnectListener) => {
      reconnectListeners.add(listener);
      return () => reconnectListeners.delete(listener);
    },
    /** Fires the reconnect listeners as a new socket would. */
    reconnect: () => {
      for (const listener of reconnectListeners) {
        void listener();
      }
    },
  };
};

const createFeedSyncHarness = async ({
  spaceId,
  spaceIds = [spaceId],
  pollingInterval,
  syncNamespaces: namespaces = [syncNamespace],
  reconcilePollingInterval,
  interceptRequest,
}: {
  spaceId: SpaceId;
  /** Every space the syncer tracks; defaults to `spaceId` alone. */
  spaceIds?: SpaceId[];
  pollingInterval?: number;
  syncNamespaces?: string[];
  reconcilePollingInterval?: number;
  interceptRequest?: (message: ProtocolMessage) => ProtocolMessage | undefined;
}) => {
  const serverRuntime = createRuntime();
  const clientRuntime = createRuntime();
  const serverFeedStore = createFeedStore('server', true);
  const clientFeedStore = createFeedStore('client', false);

  await serverFeedStore.migrate().pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));
  await clientFeedStore.migrate().pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

  const messageListeners = new Set<(message: RouterMessage) => void>();
  const sentMessages: ProtocolMessage[] = [];
  const syncServer = new SyncServer({
    peerId: 'server',
    feedStore: serverFeedStore,
    sendMessage: (_ctx, message) =>
      Effect.promise(async () => {
        const routerMessage = createBuf(MessageSchema, {
          source: {
            identityKey: 'server-identity',
            peerKey: 'server-peer',
          },
          serviceId: `${EdgeService.QUEUE_REPLICATOR}:test`,
          payload: { value: bufferToArray(encoder.encode(message)) },
        });

        for (const listener of messageListeners) {
          listener(routerMessage);
        }
      }),
  });

  const edgeClient = createEdgeConnection({
    syncServer,
    serverRuntime,
    messageListeners,
    sentMessages,
    interceptRequest,
  });

  /** Deliver a server-initiated frame the client did not ask for. */
  const pushToClient = (message: ProtocolMessage) => {
    const routerMessage = createBuf(MessageSchema, {
      source: { identityKey: 'server-identity', peerKey: 'server-peer' },
      serviceId: `${EdgeService.QUEUE_REPLICATOR}:test`,
      payload: { value: bufferToArray(encoder.encode(message)) },
    });
    for (const listener of messageListeners) {
      listener(routerMessage);
    }
  };

  const syncer = new FeedSyncer({
    runtime: clientRuntime.contextEffect,
    feedStore: clientFeedStore,
    edgeClient: edgeClient as any,
    peerId: 'client',
    getSpaceIds: () => spaceIds,
    syncNamespaces: namespaces,
    pollingInterval,
    reconcilePollingInterval,
  });

  const close = async () => {
    await syncer.close();
    await clientRuntime.dispose();
    await serverRuntime.dispose();
  };

  onTestFinished(close);

  return {
    serverRuntime,
    clientRuntime,
    serverFeedStore,
    clientFeedStore,
    syncer,
    close,
    sentMessages,
    pushToClient,
    reconnect: edgeClient.reconnect,
  };
};

describe('FeedSyncer', () => {
  test('syncs mixed pull and push traffic', async () => {
    const spaceId = SpaceId.random();
    const { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer } = await createFeedSyncHarness({
      spaceId,
    });
    const serverFeedId = EntityId.random();
    const clientFeedId = EntityId.random();

    await serverFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: serverFeedId,
          feedNamespace: syncNamespace,
          data: new Uint8Array([1, 2, 3]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

    await syncer.open(new Context());

    await vi.waitFor(async () => {
      const { blocks } = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [serverFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].data).toEqual(new Uint8Array([1, 2, 3]));
      expect(blocks[0].position).toBeDefined();
    });

    await clientFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: clientFeedId,
          feedNamespace: syncNamespace,
          data: new Uint8Array([9, 8, 7]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

    await vi.waitFor(async () => {
      const { blocks } = await serverFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [clientFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].data).toEqual(new Uint8Array([9, 8, 7]));
      expect(blocks[0].position).toBeDefined();
    });
  });

  test('pushes unpositioned backlog on open without new local writes', async () => {
    const spaceId = SpaceId.random();
    const { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer } = await createFeedSyncHarness({
      spaceId,
    });
    const clientFeedId = EntityId.random();

    await clientFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: clientFeedId,
          feedNamespace: syncNamespace,
          data: new Uint8Array([9, 8, 7]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

    await syncer.open(new Context());

    await vi.waitFor(async () => {
      const { blocks } = await serverFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [clientFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].data).toEqual(new Uint8Array([9, 8, 7]));
      expect(blocks[0].position).toBeDefined();
    });
  });

  test('requestPoll triggers best-effort pull for a space', async () => {
    const spaceId = SpaceId.random();
    const { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer } = await createFeedSyncHarness({
      spaceId,
      pollingInterval: 60_000,
    });
    const serverFeedId = EntityId.random();

    await serverFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: serverFeedId,
          feedNamespace: syncNamespace,
          data: new Uint8Array([1, 2, 3]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

    await syncer.open(new Context());

    await vi.waitFor(async () => {
      const { blocks } = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [serverFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].data).toEqual(new Uint8Array([1, 2, 3]));
    });

    await serverFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: serverFeedId,
          feedNamespace: syncNamespace,
          data: new Uint8Array([4, 5, 6]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

    // With a 60s pollingInterval, the client's next automatic poll is scheduled far in the
    // future, so it deterministically has not pulled the second block yet.
    {
      const { blocks } = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [serverFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));
      expect(blocks).toHaveLength(1);
    }

    syncer.schedulePoll();

    await vi.waitFor(async () => {
      const { blocks } = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [serverFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

      expect(blocks).toHaveLength(2);
      expect(blocks[1].data).toEqual(new Uint8Array([4, 5, 6]));
    });
  });

  test('syncs all configured namespaces', async () => {
    const spaceId = SpaceId.random();
    const { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer } = await createFeedSyncHarness({
      spaceId,
      syncNamespaces,
    });
    const serverDataFeedId = EntityId.random();
    const serverTraceFeedId = EntityId.random();

    await serverFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: serverDataFeedId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.data,
          data: new Uint8Array([1, 2, 3]),
        },
        {
          spaceId,
          feedId: serverTraceFeedId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
          data: new Uint8Array([7, 8, 9]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

    await syncer.open(new Context());

    await vi.waitFor(async () => {
      const dataResult = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.data,
          position: -1,
          query: { feedIds: [serverDataFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));
      const traceResult = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
          position: -1,
          query: { feedIds: [serverTraceFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

      expect(dataResult.blocks).toHaveLength(1);
      expect(traceResult.blocks).toHaveLength(1);
      expect(dataResult.blocks[0].data).toEqual(new Uint8Array([1, 2, 3]));
      expect(traceResult.blocks[0].data).toEqual(new Uint8Array([7, 8, 9]));
    });
  });

  test('announces a namespace-wide subscription for every synced namespace on open', async () => {
    const spaceId = SpaceId.random();
    const { syncer, sentMessages } = await createFeedSyncHarness({
      spaceId,
      pollingInterval: 60_000,
      syncNamespaces,
    });

    await syncer.open(new Context());

    await vi.waitFor(() => {
      const subscribes = sentMessages.filter((message) => message._tag === 'SubscribeRequest');
      expect(subscribes.map((message) => message.feedNamespace).sort()).toEqual([...syncNamespaces].sort());
      // Empty, because the client cannot enumerate a namespace's feed ids before it has pulled them.
      expect(subscribes.every((message) => message.feedIds.length === 0)).toBe(true);
      expect(subscribes.every((message) => message.spaceId === spaceId)).toBe(true);
    });
  });

  test('a server hint pulls the named space without waiting for the poll interval', async () => {
    const spaceId = SpaceId.random();
    const { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer, pushToClient } =
      await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });
    const serverFeedId = EntityId.random();

    const queryClient = () =>
      clientFeedStore
        .query({ spaceId, feedNamespace: syncNamespace, position: -1, query: { feedIds: [serverFeedId] } })
        .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

    const appendToServer = (data: Uint8Array) =>
      serverFeedStore
        .appendLocal([{ spaceId, feedId: serverFeedId, feedNamespace: syncNamespace, data }])
        .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

    await appendToServer(new Uint8Array([1, 2, 3]));
    await syncer.open(new Context());

    // Waiting for the first block lands the initial round, so the next append cannot ride it.
    await vi.waitFor(async () => {
      expect((await queryClient()).blocks).toHaveLength(1);
    });

    await appendToServer(new Uint8Array([7, 8, 9]));
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect((await queryClient()).blocks).toHaveLength(1);

    pushToClient({
      _tag: 'FeedAdvanced',
      spaceId,
      feedNamespace: syncNamespace,
      position: 2,
      senderPeerId: 'server',
      recipientPeerId: 'client',
    });

    await vi.waitFor(async () => {
      const { blocks } = await queryClient();
      expect(blocks).toHaveLength(2);
      expect(blocks[1].data).toEqual(new Uint8Array([7, 8, 9]));
    });
  });

  test('a hint for a space this client does not sync is ignored', async () => {
    const spaceId = SpaceId.random();
    const { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer, pushToClient } =
      await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });
    const serverFeedId = EntityId.random();

    const queryClient = () =>
      clientFeedStore
        .query({ spaceId, feedNamespace: syncNamespace, position: -1, query: { feedIds: [serverFeedId] } })
        .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));

    const appendToServer = (data: Uint8Array) =>
      serverFeedStore
        .appendLocal([{ spaceId, feedId: serverFeedId, feedNamespace: syncNamespace, data }])
        .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

    await appendToServer(new Uint8Array([1]));
    await syncer.open(new Context());

    // Waiting for the first block lands the initial round, so the next append cannot ride it.
    await vi.waitFor(async () => {
      expect((await queryClient()).blocks).toHaveLength(1);
    });

    await appendToServer(new Uint8Array([2]));

    // Well-formed but untracked: the id is server-supplied, so validity alone must not drive a pull.
    pushToClient({
      _tag: 'FeedAdvanced',
      spaceId: SpaceId.random(),
      feedNamespace: syncNamespace,
      position: 2,
      senderPeerId: 'server',
      recipientPeerId: 'client',
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect((await queryClient()).blocks).toHaveLength(1);
  });

  // A space that is not done is polled again at once, which is right for paging and a tight loop
  // against the server for a pull that fails the same way every time.
  test('backs off between polls while a pull keeps failing', async () => {
    const spaceId = SpaceId.random();
    const failedAt: number[] = [];
    const { syncer } = await createFeedSyncHarness({
      spaceId,
      pollingInterval: 60_000,
      syncNamespaces,
      interceptRequest: (message) => {
        if (message._tag !== 'QueryRequest' || message.feedNamespace !== FeedProtocol.WellKnownNamespaces.trace) {
          return undefined;
        }
        failedAt.push(Date.now());
        return {
          _tag: 'Error',
          requestId: message.requestId,
          message: 'trace namespace unavailable',
          senderPeerId: 'server',
          recipientPeerId: 'client',
        };
      },
    });

    await syncer.open(new Context());
    await vi.waitFor(() => expect(failedAt.length).toBeGreaterThanOrEqual(3), { timeout: 5_000, interval: 10 });

    // Each gap is at least the delay scheduled before it, so a stalled runner can only widen them,
    // whereas an immediate re-poll would have sent the retries within milliseconds.
    const [firstGap, secondGap] = [failedAt[1] - failedAt[0], failedAt[2] - failedAt[1]];
    expect(firstGap).toBeGreaterThanOrEqual(250 - TIMER_SLACK_MS);
    expect(secondGap).toBeGreaterThanOrEqual(500 - TIMER_SLACK_MS);
  });

  // The back-off must leave the full-poll bookkeeping in place: the failing space stays in the set
  // to poll while every healthy space left it as done, so without the interval nothing but a hint
  // would ever poll the healthy ones again.
  test('a pull that keeps failing does not stop the other spaces from being polled', async () => {
    const failingSpaceId = SpaceId.random();
    const healthySpaceId = SpaceId.random();
    const healthyFeedId = EntityId.random();
    const { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer, sentMessages } =
      await createFeedSyncHarness({
        spaceId: failingSpaceId,
        spaceIds: [failingSpaceId, healthySpaceId],
        pollingInterval: 200,
        interceptRequest: (message) =>
          message._tag === 'QueryRequest' && message.spaceId === failingSpaceId
            ? {
                _tag: 'Error',
                requestId: message.requestId,
                message: 'space unavailable',
                senderPeerId: 'server',
                recipientPeerId: 'client',
              }
            : undefined,
      });

    await syncer.open(new Context());
    // The first retry means the first round is over, with the healthy space polled and done.
    const failingPulls = () =>
      sentMessages.filter((message) => message._tag === 'QueryRequest' && message.spaceId === failingSpaceId);
    await vi.waitFor(() => expect(failingPulls().length).toBeGreaterThanOrEqual(2));

    await serverFeedStore
      .appendLocal([
        { spaceId: healthySpaceId, feedId: healthyFeedId, feedNamespace: syncNamespace, data: new Uint8Array([1]) },
      ])
      .pipe(RuntimeProvider.runPromise(serverRuntime.contextEffect));

    // No hint is sent, so only the interval-driven full poll can bring the block over.
    await vi.waitFor(
      async () => {
        const { blocks } = await clientFeedStore
          .query({
            spaceId: healthySpaceId,
            feedNamespace: syncNamespace,
            position: -1,
            query: { feedIds: [healthyFeedId] },
          })
          .pipe(RuntimeProvider.runPromise(clientRuntime.contextEffect));
        expect(blocks).toHaveLength(1);
      },
      { timeout: 5_000 },
    );
  });

  // The push back-off is one value for every space and namespace. Reset by any push that went
  // through, it never grew while one namespace kept failing next to a healthy one, so the failing
  // push was retried at the minimum delay for as long as the failure lasted.
  test('backs off between push retries while a push keeps failing next to a healthy namespace', async () => {
    const spaceId = SpaceId.random();
    const failedAt: number[] = [];
    const { clientRuntime, clientFeedStore, syncer } = await createFeedSyncHarness({
      spaceId,
      pollingInterval: 60_000,
      syncNamespaces,
      interceptRequest: (message) => {
        if (message._tag !== 'AppendRequest' || message.feedNamespace !== FeedProtocol.WellKnownNamespaces.trace) {
          return undefined;
        }
        failedAt.push(Date.now());
        return {
          _tag: 'Error',
          requestId: message.requestId,
          message: 'trace namespace unavailable',
          senderPeerId: 'server',
          recipientPeerId: 'client',
        };
      },
    });
    await seedBlocks(clientFeedStore, clientRuntime, spaceId, 1, FeedProtocol.WellKnownNamespaces.trace);

    await syncer.open(new Context());
    await vi.waitFor(() => expect(failedAt.length).toBeGreaterThanOrEqual(3), { timeout: 5_000, interval: 10 });

    const [firstGap, secondGap] = [failedAt[1] - failedAt[0], failedAt[2] - failedAt[1]];
    expect(firstGap).toBeGreaterThanOrEqual(250 - TIMER_SLACK_MS);
    expect(secondGap).toBeGreaterThanOrEqual(500 - TIMER_SLACK_MS);
  });

  // The server drops frames for a deleted space, so before this the client waited out its RPC timeout
  // on every request to it; with the reason named, the space costs nothing until the next connection.
  test('stops syncing a space the server reports deleted until the connection is re-established', async () => {
    const deletedSpaceId = SpaceId.random();
    const liveSpaceId = SpaceId.random();
    const { syncer, sentMessages, reconnect } = await createFeedSyncHarness({
      spaceId: liveSpaceId,
      spaceIds: [deletedSpaceId, liveSpaceId],
      pollingInterval: 100,
      interceptRequest: (message) =>
        (message._tag === 'QueryRequest' || message._tag === 'AppendRequest') && message.spaceId === deletedSpaceId
          ? {
              _tag: 'Error',
              requestId: message.requestId,
              message: 'space deleted',
              code: FeedProtocol.ErrorCode.SPACE_DELETED,
              senderPeerId: 'server',
              recipientPeerId: 'client',
            }
          : undefined,
    });
    const requestsFor = (spaceId: SpaceId) =>
      sentMessages.filter(
        (message) =>
          (message._tag === 'QueryRequest' || message._tag === 'AppendRequest') && message.spaceId === spaceId,
      ).length;

    await syncer.open(new Context());
    await vi.waitFor(() => expect(requestsFor(deletedSpaceId)).toBeGreaterThanOrEqual(1));
    const afterReport = requestsFor(deletedSpaceId);
    const liveBefore = requestsFor(liveSpaceId);

    // Several polling intervals: the live space keeps being polled, the deleted one is never asked again.
    await vi.waitFor(() => expect(requestsFor(liveSpaceId)).toBeGreaterThanOrEqual(liveBefore + 3));
    expect(requestsFor(deletedSpaceId)).toBe(afterReport);

    // A new connection may be to a server that revived the space, so the report is checked once more.
    reconnect();
    await vi.waitFor(() => expect(requestsFor(deletedSpaceId)).toBe(afterReport + 1));
    const liveAfterReconnect = requestsFor(liveSpaceId);
    await vi.waitFor(() => expect(requestsFor(liveSpaceId)).toBeGreaterThanOrEqual(liveAfterReconnect + 3));
    expect(requestsFor(deletedSpaceId)).toBe(afterReport + 1);
  });

  test('a hint for an unknown space id is ignored rather than throwing', async () => {
    const spaceId = SpaceId.random();
    const { syncer, pushToClient } = await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });

    await syncer.open(new Context());

    expect(() =>
      pushToClient({
        _tag: 'FeedAdvanced',
        spaceId: 'not-a-space-id',
        feedNamespace: syncNamespace,
        position: 1,
        senderPeerId: 'server',
        recipientPeerId: 'client',
      }),
    ).not.toThrow();
  });
});

/** Appends `count` local blocks to one feed of a space. */
const seedBlocks = (
  feedStore: FeedStore,
  runtime: ReturnType<typeof createRuntime>,
  spaceId: SpaceId,
  count: number,
  feedNamespace: string = syncNamespace,
) =>
  feedStore
    .appendLocal(
      Array.from({ length: count }, (_unused, index) => ({
        spaceId,
        feedId: EntityId.random(),
        feedNamespace,
        data: new Uint8Array([index % 256]),
      })),
    )
    .pipe(RuntimeProvider.runPromise(runtime.contextEffect));
