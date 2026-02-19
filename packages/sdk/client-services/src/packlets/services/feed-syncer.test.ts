//
// Copyright 2026 DXOS.org
//

import { Encoder, decode as cborDecode } from 'cbor-x';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { describe, expect, test, vi } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type EdgeConnection, MessageSchema } from '@dxos/edge-client';
import { RuntimeProvider } from '@dxos/effect';
import { FeedStore, SyncServer } from '@dxos/feed';
import { ObjectId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { EdgeService } from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import { type Message as RouterMessage } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import { bufferToArray } from '@dxos/util';

import { FeedSyncer } from './feed-syncer';

type ProtocolMessage = FeedProtocol.ProtocolMessage;

const encoder = new Encoder({ tagUint8Array: false, useRecords: false });

describe('FeedSyncer', () => {
  test('syncs mixed pull and push traffic', async () => {
    const serverBaseLayer = layerMemory;
    const serverTransactionLayer = SqlTransaction.layer.pipe(Layer.provide(serverBaseLayer));
    const serverRuntime = ManagedRuntime.make(Layer.merge(serverBaseLayer, serverTransactionLayer).pipe(Layer.orDie));

    const clientBaseLayer = layerMemory;
    const clientTransactionLayer = SqlTransaction.layer.pipe(Layer.provide(clientBaseLayer));
    const clientRuntime = ManagedRuntime.make(Layer.merge(clientBaseLayer, clientTransactionLayer).pipe(Layer.orDie));

    const serverFeedStore = new FeedStore({ localActorId: 'server', assignPositions: true });
    const clientFeedStore = new FeedStore({ localActorId: 'client', assignPositions: false });

    await serverFeedStore.migrate().pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));
    await clientFeedStore.migrate().pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));

    const spaceId = SpaceId.random();
    const serverFeedId = ObjectId.random();
    const clientFeedId = ObjectId.random();

    await serverFeedStore
      .appendLocal([
        {
          spaceId,
          feedId: serverFeedId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.data,
          data: new Uint8Array([1, 2, 3]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));

    const messageListeners = new Set<(message: RouterMessage) => void>();
    const reconnectListeners = new Set<() => void>();

    const syncServer = new SyncServer({
      peerId: 'server',
      feedStore: serverFeedStore,
      sendMessage: (message) =>
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

    const edgeClient: EdgeConnection = {
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

    const syncer = new FeedSyncer({
      runtime: clientRuntime.runtimeEffect,
      feedStore: clientFeedStore,
      edgeClient: edgeClient as any,
      peerId: 'client',
      getSpaceIds: () => [spaceId],
      syncNamespace: FeedProtocol.WellKnownNamespaces.data,
    });

    await syncer.open(new Context());

    await vi.waitFor(async () => {
      const { blocks } = await clientFeedStore
        .query({
          spaceId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.data,
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
          feedNamespace: FeedProtocol.WellKnownNamespaces.data,
          data: new Uint8Array([9, 8, 7]),
        },
      ])
      .pipe(RuntimeProvider.runPromise(clientRuntime.runtimeEffect));

    await vi.waitFor(async () => {
      const { blocks: serverBlocks } = await serverFeedStore
        .query({
          spaceId,
          feedNamespace: FeedProtocol.WellKnownNamespaces.data,
          position: -1,
          query: { feedIds: [clientFeedId] },
        })
        .pipe(RuntimeProvider.runPromise(serverRuntime.runtimeEffect));

      expect(serverBlocks).toHaveLength(1);
      expect(serverBlocks[0].data).toEqual(new Uint8Array([9, 8, 7]));
      expect(serverBlocks[0].position).toBeDefined();
    });

    await syncer.close();
    await clientRuntime.dispose();
    await serverRuntime.dispose();
  });
});
