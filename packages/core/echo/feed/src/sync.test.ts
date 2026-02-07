//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, test } from '@effect/vitest';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { Resource } from '@dxos/context';
import { RuntimeProvider } from '@dxos/effect';
import { ObjectId, SpaceId } from '@dxos/keys';
import { QueueProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import { FeedStore } from './feed-store';
import { SyncClient } from './sync-client';
import { SyncServer } from './sync-server';

type ProtocolMessage = QueueProtocol.ProtocolMessage;
const WellKnownNamespaces = QueueProtocol.WellKnownNamespaces;
type AppendRequest = QueueProtocol.AppendRequest;
type Block = QueueProtocol.Block;
type QueryRequest = QueueProtocol.QueryRequest;
import { range } from '@dxos/util';

import * as Statement from '@effect/sql/Statement';

const LOG_SQL = false;

class Peer extends Resource {
  readonly #peerId: string;
  #feedStore: FeedStore;
  #runtime: ManagedRuntime.ManagedRuntime<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction,
    never
  >;
  #client?: SyncClient;
  #server?: SyncServer;

  constructor({
    isServer,
    actorId,
    serverPeerId,
    sendMessage,
  }: {
    isServer: boolean;
    actorId: string;
    serverPeerId?: string;
    sendMessage: (msg: ProtocolMessage) => Effect.Effect<void, unknown, never>;
  }) {
    super();
    this.#peerId = actorId;
    this.#feedStore = new FeedStore({ localActorId: actorId, assignPositions: isServer });
    const baseLayer = layerMemory.pipe(
      Layer.provide(LOG_SQL ? Statement.setTransformer(loggingTransformer) : Layer.empty),
    );
    const transactionLayer = SqlTransaction.layer.pipe(Layer.provide(baseLayer));
    this.#runtime = ManagedRuntime.make(Layer.merge(baseLayer, transactionLayer).pipe(Layer.orDie));
    if (isServer) {
      this.#server = new SyncServer({
        peerId: actorId,
        feedStore: this.#feedStore,
        sendMessage,
      });
    } else {
      this.#client = new SyncClient({
        peerId: actorId,
        serverPeerId: serverPeerId!,
        feedStore: this.#feedStore,
        sendMessage,
      });
    }
  }

  get peerId() {
    return this.#peerId;
  }

  get feedStore() {
    return this.#feedStore;
  }

  get runtime() {
    return this.#runtime;
  }

  get syncClient() {
    return this.#client;
  }

  get syncServer() {
    return this.#server;
  }

  protected override async _open(): Promise<void> {
    await this.#feedStore.migrate().pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  protected override async _close(): Promise<void> {
    await this.#runtime.dispose();
  }

  export(): Promise<Uint8Array> {
    return Effect.gen(function* () {
      const sql = yield* SqlExport.SqlExport;
      return yield* sql.export;
    }).pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  getSyncState({ spaceId, feedNamespace }: { spaceId: SpaceId; feedNamespace: string }) {
    return this.#feedStore
      .getSyncState({ spaceId, feedNamespace })
      .pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  query(req: QueryRequest) {
    return this.#feedStore.query(req).pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  append(req: AppendRequest) {
    return this.#feedStore.append(req).pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }

  appendLocal(req: Parameters<FeedStore['appendLocal']>[0]) {
    return this.#feedStore.appendLocal(req).pipe(RuntimeProvider.runPromise(this.#runtime.runtimeEffect));
  }
}

class TestBuilder extends Resource {
  #peers: Peer[] = [];
  readonly #spaceId: SpaceId;
  readonly #feedNamespace: string;

  constructor({
    numPeers,
    spaceId,
    feedNamespace = WellKnownNamespaces.data,
  }: {
    numPeers: number;
    spaceId: SpaceId;
    feedNamespace?: string;
  }) {
    super();
    this.#spaceId = spaceId;
    this.#feedNamespace = feedNamespace;
    this.#peers = Array.makeBy(
      numPeers,
      (i) =>
        new Peer({
          isServer: i === 0,
          actorId: `peer-${i}`,
          serverPeerId: i === 0 ? undefined : 'peer-0',
          sendMessage: (msg) => this.#routeMessage(msg),
        }),
    );
  }

  get peers() {
    return this.#peers;
  }

  get server() {
    return this.#peers[0];
  }

  protected override async _open(): Promise<void> {
    await Promise.all(this.#peers.map((peer) => peer.open()));
  }

  protected override async _close(): Promise<void> {
    await Promise.all(this.#peers.map((peer) => peer.close()));
  }

  async pull(client: Peer, { limit = 10 }: { limit?: number } = {}): Promise<{ done: boolean }> {
    return RuntimeProvider.runPromise(client.runtime.runtimeEffect)(
      client.syncClient!.pull({
        spaceId: this.#spaceId,
        feedNamespace: this.#feedNamespace,
        limit,
      }),
    );
  }

  async push(client: Peer, { limit = 10 }: { limit?: number } = {}): Promise<{ done: boolean }> {
    return RuntimeProvider.runPromise(client.runtime.runtimeEffect)(
      client.syncClient!.push({
        spaceId: this.#spaceId,
        feedNamespace: this.#feedNamespace,
        limit,
      }),
    );
  }

  /** Route a message to the peer identified by recipientPeerId. Runs the recipient's handleMessage with that peer's runtime. */
  #routeMessage(msg: ProtocolMessage): Effect.Effect<void, unknown, never> {
    const peer = this.#peers.find((p) => p.peerId === msg.recipientPeerId);
    if (peer == null) {
      return Effect.die(new Error(`Peer not found: ${msg.recipientPeerId}`));
    }
    const handleEffect =
      peer.syncServer != null
        ? peer.syncServer.handleMessage(msg)
        : peer.syncClient != null
          ? peer.syncClient.handleMessage(msg)
          : null;
    if (handleEffect == null) {
      return Effect.die(new Error(`Peer has no handler: ${msg.recipientPeerId}`));
    }
    return Effect.promise(() => RuntimeProvider.runPromise(peer.runtime.runtimeEffect)(handleEffect));
  }
}

const spaceId = SpaceId.random();
const feedId = ObjectId.random();

describe('Sync', () => {
  test('pull blocks from server', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await server.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(server.runtime.runtimeEffect));

    await builder.pull(client);

    const { blocks } = await client.feedStore
      .query({
        spaceId,
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(blocks.map((block) => block.data)).toEqual(testBlocks);
  });

  test('push blocks from client to server', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));

    await builder.push(client);

    const serverBlocks = await server.feedStore
      .query({
        spaceId,
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(server.runtime.runtimeEffect));
    expect(serverBlocks.blocks.map((block) => block.data)).toEqual(testBlocks);
    expect(serverBlocks.blocks.every((block) => block.position != null)).toBe(true);

    const clientBlocks = await client.feedStore
      .query({
        spaceId,
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(clientBlocks.blocks.map((block) => block.position)).toEqual(
      serverBlocks.blocks.map((block) => block.position),
    );
  });

  test('push blocks incrementally in batches', async () => {
    await using builder = await new TestBuilder({ numPeers: 2, spaceId }).open();
    const [server, client] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client.feedStore
      .appendLocal(
        testBlocks.map((block) => ({
          spaceId,
          feedId,
          feedNamespace: WellKnownNamespaces.data,
          data: block,
        })),
      )
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));

    let done = false,
      numBatches = 0;
    while (!done) {
      numBatches++;
      const result = await builder.push(client, { limit: 2 });
      done = result.done;
    }
    await builder.push(client);
    expect(numBatches).toBeGreaterThan(2);
    expect(numBatches).toBeLessThan(10);

    const serverBlocks = await server.feedStore
      .query({
        spaceId,
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(server.runtime.runtimeEffect));
    expect(serverBlocks.blocks.map((block) => block.data)).toEqual(testBlocks);
    expect(serverBlocks.blocks.every((block) => block.position != null)).toBe(true);

    const clientBlocks = await client.feedStore
      .query({
        spaceId,
        query: { feedNamespace: WellKnownNamespaces.data },
      })
      .pipe(RuntimeProvider.runPromise(client.runtime.runtimeEffect));
    expect(clientBlocks.blocks.map((block) => block.position)).toEqual(
      serverBlocks.blocks.map((block) => block.position),
    );
  });

  test('3-way sync', async () => {
    await using builder = await new TestBuilder({ numPeers: 3, spaceId }).open();
    const [server, client1, client2] = builder.peers;

    const testBlocks = generateTestBlocks(0, 5);

    await client1.feedStore
      .appendLocal(
        testBlocks.map((block) => ({ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: block })),
      )
      .pipe(RuntimeProvider.runPromise(client1.runtime.runtimeEffect));
    await builder.push(client1);

    await builder.pull(client2);

    const { blocks: client1Blocks } = await client1.feedStore
      .query({ spaceId, query: { feedNamespace: WellKnownNamespaces.data } })
      .pipe(RuntimeProvider.runPromise(client1.runtime.runtimeEffect));
    const { blocks: client2Blocks } = await client2.feedStore
      .query({ spaceId, query: { feedNamespace: WellKnownNamespaces.data } })
      .pipe(RuntimeProvider.runPromise(client2.runtime.runtimeEffect));
    expect(client1Blocks).toEqual(client2Blocks);
    expect(client1Blocks.every((block) => block.position != null)).toBe(true);
  });
});

const generateTestBlocks = (start: number, count: number) => range(count, (i) => new Uint8Array([start + i]));

const loggingTransformer: Statement.Statement.Transformer = (stmt, make, _, span) =>
  Effect.sync(() => {
    const [sql, params] = stmt.compile();
    // eslint-disable-next-line no-console
    console.log(sql.trim());
    // eslint-disable-next-line no-console
    console.log(params);
    return stmt;
  });
