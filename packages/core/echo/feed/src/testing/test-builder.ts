//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import * as Statement from 'effect/unstable/sql/Statement';

import { Context, Resource } from '@dxos/context';
import { RuntimeProvider } from '@dxos/effect';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import { FeedStore } from '../feed-store';
import { SyncClient } from '../sync-client';
import { SyncServer } from '../sync-server';

type ProtocolMessage = FeedProtocol.ProtocolMessage;
const WellKnownNamespaces = FeedProtocol.WellKnownNamespaces;
type AppendRequest = FeedProtocol.AppendRequest;
type QueryRequest = FeedProtocol.QueryRequest;

export class TestBuilder extends Resource {
  #peers: TestPeer[] = [];
  readonly #spaceId: SpaceId;
  readonly #feedNamespace: string;
  readonly #logSql: boolean;

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
    this.#logSql = logSql;
    this.#peers = Array.makeBy(
      numPeers,
      (i) =>
        new TestPeer({
          isServer: i === 0,
          actorId: `peer-${i}`,
          serverPeerId: i === 0 ? undefined : 'peer-0',
          sendMessage: (ctx, msg) => this.#routeMessage(ctx, msg),
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

  /**
   * Swaps the server for one with empty storage, keeping its peer id, so clients keep addressing
   * the same peer while everything it had assigned is gone. Models a redeployed or wiped server.
   */
  async replaceServer(): Promise<TestPeer> {
    const previous = this.#peers[0];
    await previous.close();
    const replacement = new TestPeer({
      isServer: true,
      actorId: previous.peerId,
      sendMessage: (ctx, msg) => this.#routeMessage(ctx, msg),
      logSql: this.#logSql,
    });
    this.#peers[0] = replacement;
    await replacement.open();
    return replacement;
  }

  async pull(client: TestPeer, { limit = 10 }: { limit?: number } = {}): Promise<{ done: boolean }> {
    return client.pull({ spaceId: this.#spaceId, feedNamespace: this.#feedNamespace, limit });
  }

  async push(client: TestPeer, { limit = 10 }: { limit?: number } = {}): Promise<{ done: boolean }> {
    return client.push({ spaceId: this.#spaceId, feedNamespace: this.#feedNamespace, limit });
  }

  /** Route a message to the peer identified by recipientPeerId. Runs the recipient's handleMessage with that peer's runtime. */
  #routeMessage(ctx: Context, msg: ProtocolMessage): Effect.Effect<void, unknown, never> {
    const peer = this.#peers.find((p) => p.peerId === msg.recipientPeerId);
    if (peer == null) {
      return Effect.die(new Error(`TestPeer not found: ${msg.recipientPeerId}`));
    }
    const handleEffect =
      peer.syncServer != null
        ? peer.syncServer.handleMessage(ctx, msg)
        : peer.syncClient != null
          ? peer.syncClient.handleMessage(msg)
          : null;
    if (handleEffect == null) {
      return Effect.die(new Error(`TestPeer has no handler: ${msg.recipientPeerId}`));
    }
    return Effect.promise(() => RuntimeProvider.runPromise(peer.runtime.contextEffect)(handleEffect));
  }
}

const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>
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
    sendMessage: (ctx: Context, msg: ProtocolMessage) => Effect.Effect<void, unknown, never>;
    logSql?: boolean;
  }) {
    super();
    this.#peerId = actorId;
    this.#feedStore = new FeedStore({ localActorId: actorId, assignPositions: isServer });
    const baseLayer = layerMemory.pipe(
      Layer.provide(logSql ? Layer.succeed(Statement.CurrentTransformer, loggingTransformer) : Layer.empty),
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
    await this.#feedStore.migrate().pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  protected override async _close(): Promise<void> {
    await this.#runtime.dispose();
  }

  export(): Promise<Uint8Array> {
    return Effect.gen(function* () {
      const sql = yield* SqlExport.SqlExport;
      return yield* sql.export;
    }).pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  getServerToken(spaceId: SpaceId) {
    return this.#feedStore.getServerToken(spaceId).pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  getSyncState({ spaceId, feedNamespace }: { spaceId: SpaceId; feedNamespace: string }) {
    return this.#feedStore
      .getSyncState({ spaceId, feedNamespace })
      .pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  setSyncState(opts: { spaceId: SpaceId; feedNamespace: string; lastPulledPosition: number; serverToken?: string }) {
    return this.#feedStore.setSyncState(opts).pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  query(req: QueryRequest) {
    return this.#feedStore.query(req).pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  append(req: AppendRequest) {
    return this.#feedStore.append(req).pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  appendLocal(req: Parameters<FeedStore['appendLocal']>[0]) {
    return this.#feedStore.appendLocal(req).pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  pull({ spaceId, feedNamespace, limit = 10 }: { spaceId: SpaceId; feedNamespace: string; limit?: number }) {
    return this.#client!
      .pull(Context.default(), { spaceId, feedNamespace, limit })
      .pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }

  push({ spaceId, feedNamespace, limit = 10 }: { spaceId: SpaceId; feedNamespace: string; limit?: number }) {
    return this.#client!
      .push(Context.default(), { spaceId, feedNamespace, limit })
      .pipe(RuntimeProvider.runPromise(this.#runtime.contextEffect));
  }
}
