//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Statement from '@effect/sql/Statement';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { Resource } from '@dxos/context';
import { RuntimeProvider } from '@dxos/effect';
import { type SpaceId } from '@dxos/keys';
import { QueueProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import { FeedStore } from '../feed-store';
import { SyncClient } from '../sync-client';
import { SyncServer } from '../sync-server';

type ProtocolMessage = QueueProtocol.ProtocolMessage;
const WellKnownNamespaces = QueueProtocol.WellKnownNamespaces;
type AppendRequest = QueueProtocol.AppendRequest;
type QueryRequest = QueueProtocol.QueryRequest;

export class TestBuilder extends Resource {
  #peers: TestPeer[] = [];
  readonly #spaceId: SpaceId;
  readonly #feedNamespace: string;

  constructor({
    numPeers,
    spaceId,
    feedNamespace = WellKnownNamespaces.data,
    logSql = false,
  }: {
    numPeers: number;
    spaceId: SpaceId;
    feedNamespace?: string;
    logSql?: boolean;
  }) {
    super();
    this.#spaceId = spaceId;
    this.#feedNamespace = feedNamespace;
    this.#peers = Array.makeBy(
      numPeers,
      (i) =>
        new TestPeer({
          isServer: i === 0,
          actorId: `peer-${i}`,
          serverPeerId: i === 0 ? undefined : 'peer-0',
          sendMessage: (msg) => this.#routeMessage(msg),
          logSql,
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

  async pull(client: TestPeer, { limit = 10 }: { limit?: number } = {}): Promise<{ done: boolean }> {
    return RuntimeProvider.runPromise(client.runtime.runtimeEffect)(
      client.syncClient!.pull({
        spaceId: this.#spaceId,
        feedNamespace: this.#feedNamespace,
        limit,
      }),
    );
  }

  async push(client: TestPeer, { limit = 10 }: { limit?: number } = {}): Promise<{ done: boolean }> {
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
      return Effect.die(new Error(`TestPeer not found: ${msg.recipientPeerId}`));
    }
    const handleEffect =
      peer.syncServer != null
        ? peer.syncServer.handleMessage(msg)
        : peer.syncClient != null
          ? peer.syncClient.handleMessage(msg)
          : null;
    if (handleEffect == null) {
      return Effect.die(new Error(`TestPeer has no handler: ${msg.recipientPeerId}`));
    }
    return Effect.promise(() => RuntimeProvider.runPromise(peer.runtime.runtimeEffect)(handleEffect));
  }
}

const loggingTransformer: Statement.Statement.Transformer = (stmt, _make, _, _span) =>
  Effect.sync(() => {
    const [sql, params] = stmt.compile();
    console.log(sql.trim());
    console.log(params);
    return stmt;
  });

export class TestPeer extends Resource {
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
    logSql = false,
  }: {
    isServer: boolean;
    actorId: string;
    serverPeerId?: string;
    sendMessage: (msg: ProtocolMessage) => Effect.Effect<void, unknown, never>;
    logSql?: boolean;
  }) {
    super();
    this.#peerId = actorId;
    this.#feedStore = new FeedStore({ localActorId: actorId, assignPositions: isServer });
    const baseLayer = layerMemory.pipe(
      Layer.provide(logSql ? Statement.setTransformer(loggingTransformer) : Layer.empty),
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
