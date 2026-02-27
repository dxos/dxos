//
// Copyright 2026 DXOS.org
//

import { Encoder, decode as cborDecode } from 'cbor-x';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type EdgeConnection, MessageSchema } from '@dxos/edge-client';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore, SyncServer } from '@dxos/feed';
import { ObjectId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { EdgeService } from '@dxos/protocols';
import { create } from '@dxos/protocols/buf';
import { type Message as RouterMessage } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import { bufferToArray } from '@dxos/util';

import { FeedSyncer } from './feed-syncer';

type ProtocolMessage = FeedProtocol.ProtocolMessage;

const encoder = new Encoder({ tagUint8Array: false, useRecords: false });
const syncNamespace = FeedProtocol.WellKnownNamespaces.data;
const syncNamespaces = [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace];

const createRuntime = () => {
  const baseLayer = layerMemory;
  const transactionLayer = SqlTransaction.layer.pipe(Layer.provide(baseLayer));
  return ManagedRuntime.make(Layer.merge(baseLayer, transactionLayer).pipe(Layer.orDie));
};

const createFeedStore = (localActorId: string, assignPositions: boolean) =>
  new FeedStore({ localActorId, assignPositions });

const createEdgeConnection = ({
  syncServer,
  serverRuntime,
  messageListeners,
}: {
  syncServer: SyncServer;
  serverRuntime: ReturnType<typeof createRuntime>;
  messageListeners: Set<(message: RouterMessage) => void>;
}): EdgeConnection => {
  const reconnectListeners = new Set<() => void>();

  return {
    statusChanged: new Event<any>(),
    info: {},
    identityKey: 'client-identity',
    peerKey: 'client-peer',
    isOpen: true,
    status: {
      state: EdgeStatus.ConnectionState.CONNECTED,
      rtt: 0,
      uptime: 0,
      rateBytesUp: 0,
      rateBytesDown: 0,
      messagesSent: 0,
      messagesReceived: 0,
    },
    setIdentity: () => {},
    open: async () => {},
    close: async () => {},
    send: async (routerMessage: RouterMessage) => {
      const decoded = cborDecode(routerMessage.payload!.value) as ProtocolMessage;
      await syncServer.handleMessage(decoded).pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));
    },
    onMessage: (listener: (message: RouterMessage) => void) => {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    onReconnected: (listener: () => void) => {
      reconnectListeners.add(listener);
      return () => reconnectListeners.delete(listener);
    },
  };
};

const createFeedSyncHarness = async ({
  spaceId,
  pollingInterval,
  syncNamespaces: namespaces = [syncNamespace],
}: {
  spaceId: SpaceId;
  pollingInterval?: number;
  syncNamespaces?: string[];
}) => {
  const serverRuntime = createRuntime();
  const clientRuntime = createRuntime();
  const serverFeedStore = createFeedStore('server', true);
  const clientFeedStore = createFeedStore('client', false);

  await serverFeedStore.migrate().pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));
  await clientFeedStore.migrate().pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));

  const messageListeners = new Set<(message: RouterMessage) => void>();
  const syncServer = new SyncServer({
    peerId: 'server',
    feedStore: serverFeedStore,
    sendMessage: (message) =>
      Effect.promise(async () => {
        const routerMessage = create(MessageSchema, {
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

  const edgeClient = createEdgeConnection({ syncServer, serverRuntime, messageListeners });

  const syncer = new FeedSyncer({
    runtime: clientRuntime.runtimeEffect,
    feedStore: clientFeedStore,
    edgeClient: edgeClient as any,
    peerId: 'client',
    getSpaceIds: () => [spaceId],
    syncNamespaces: namespaces,
    pollingInterval,
  });

  const close = async () => {
    await syncer.close();
    await clientRuntime.dispose();
    await serverRuntime.dispose();
  };

  onTestFinished(close);

  return { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer, close };
};

describe('FeedSyncer', () => {
  test('syncs mixed pull and push traffic', async () => {
    const spaceId = SpaceId.random();
    const { serverRuntime, clientRuntime, serverFeedStore, clientFeedStore, syncer } = await createFeedSyncHarness({
      spaceId,
    });
    const serverFeedId = ObjectId.random();
    const clientFeedId = ObjectId.random();

    await serverFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: serverFeedId,
          feedNamespace: syncNamespace,
          data: new Uint8Array([1, 2, 3]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));

    await syncer.open(new Context());

    await vi.waitFor(async () => {
      const { blocks } = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [serverFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));

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
      .pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));

    await vi.waitFor(async () => {
      const { blocks } = await serverFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [clientFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));

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
    const serverFeedId = ObjectId.random();

    await serverFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: serverFeedId,
          feedNamespace: syncNamespace,
          data: new Uint8Array([1, 2, 3]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));

    await syncer.open(new Context());

    await vi.waitFor(async () => {
      const { blocks } = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [serverFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));

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
      .pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));

    await new Promise((resolve) => setTimeout(resolve, 250));
    {
      const { blocks } = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: syncNamespace,
          position: -1,
          query: { feedIds: [serverFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));
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
        .pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));

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
    const serverDataFeedId = ObjectId.random();
    const serverTraceFeedId = ObjectId.random();

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
      .pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));

    await syncer.open(new Context());

    await vi.waitFor(async () => {
      const dataResult = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.data,
          position: -1,
          query: { feedIds: [serverDataFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));
      const traceResult = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
          position: -1,
          query: { feedIds: [serverTraceFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));

      expect(dataResult.blocks).toHaveLength(1);
      expect(traceResult.blocks).toHaveLength(1);
      expect(dataResult.blocks[0].data).toEqual(new Uint8Array([1, 2, 3]));
      expect(traceResult.blocks[0].data).toEqual(new Uint8Array([7, 8, 9]));
    });
  });
});
