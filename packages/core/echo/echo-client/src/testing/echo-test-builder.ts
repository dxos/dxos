//
// Copyright 2024 DXOS.org
//

import type { AutomergeUrl } from '@automerge/automerge-repo';
import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';
import isEqual from 'fast-deep-equal';

import { waitForCondition } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { type Entity, Filter, Obj, Query, type Type } from '@dxos/echo';
import { EchoHost } from '@dxos/echo-host';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { makeInProcessClient } from '@dxos/protocols';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';
import { layerFile, layerMemory } from '@dxos/sql-sqlite/platform';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { range } from '@dxos/util';

import { EchoClient } from '../client';
import { type BranchStore } from '../core-db';
import { type EchoDatabase } from '../proxy-db';

type OpenDatabaseOptions = {
  client?: EchoClient;
  reactiveSchemaQuery?: boolean;
  preloadSchemaOnOpen?: boolean;
};

type PeerOptions = {
  types?: Type.AnyEntity[];
  registry?: Entity.Unknown[];
  assignQueuePositions?: boolean;
  /** Path to a file-based SQLite database for persistence tests. Uses in-memory SQLite when omitted. */
  storagePath?: string;
};

export class EchoTestBuilder extends Resource {
  private readonly _peers: EchoTestPeer[] = [];

  get lastPeer(): EchoTestPeer | undefined {
    return this._peers.at(-1);
  }

  protected override async _close(ctx: Context): Promise<void> {
    await Promise.all(this._peers.map((peer) => peer.close(ctx)));
    await Promise.all(this._peers.map((peer) => peer.disposeStorage()));
  }

  async createPeer(options: PeerOptions = {}): Promise<EchoTestPeer> {
    const peer = new EchoTestPeer(options);
    this._peers.push(peer);
    await peer.open();
    return peer;
  }

  /**
   * Shorthand for creating a peer and a database.
   */
  async createDatabase(options: PeerOptions = {}) {
    const peer = await this.createPeer(options);
    const key = PublicKey.random();
    const db = await peer.createDatabase(key);
    return {
      key,
      peer,
      host: peer.host,
      graph: db.graph,
      db,
    };
  }
}

export class EchoTestPeer extends Resource {
  private readonly _types: Type.AnyEntity[];
  private readonly _registry: Entity.Unknown[];
  private readonly _assignQueuePositions?: boolean;
  private readonly _storagePath?: string;
  private readonly _clients = new Set<EchoClient>();
  private _echoHost!: EchoHost;
  private _echoClient!: EchoClient;
  /** Owns the in-process effect-rpc clients bridged from the host handlers. */
  private _serviceScope?: Scope.CloseableScope;
  private _lastDatabaseSpaceKey?: PublicKey = undefined;
  private _lastDatabaseRootUrl?: string = undefined;

  /**
   * Device-local current-branch selections per space, held on the peer so they survive `reload()`
   * (which recreates ECHO but not the peer). Stands in for the host metadata store; non-synced.
   */
  private readonly _branchStores = new Map<string, Map<string, string>>();

  private _branchStoreFor(spaceId: string): BranchStore {
    let map = this._branchStores.get(spaceId);
    if (!map) {
      map = new Map<string, string>();
      this._branchStores.set(spaceId, map);
    }
    const store = map;
    return {
      load: async () => Object.fromEntries(store),
      save: async (entries) => {
        store.clear();
        for (const [key, value] of Object.entries(entries)) {
          store.set(key, value);
        }
      },
    };
  }

  private _persistentRuntime?: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient | SqlExport.SqlExport, never>;
  private _managedRuntime!: ManagedRuntime.ManagedRuntime<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction,
    never
  >;

  constructor({ types, registry, assignQueuePositions, storagePath }: PeerOptions = {}) {
    super();
    // Include Expando as default type for tests that use Obj.make(TestSchema.Expando, ...).
    this._types = [TestSchema.Expando, ...(types ?? [])];
    this._registry = registry ?? [];
    this._assignQueuePositions = assignQueuePositions;
    this._storagePath = storagePath;
  }

  private _createManagedRuntime(): ManagedRuntime.ManagedRuntime<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction,
    never
  > {
    if (this._persistentRuntime == null) {
      const baseLayer = this._storagePath ? layerFile(this._storagePath) : layerMemory;
      this._persistentRuntime = ManagedRuntime.make(baseLayer.pipe(Layer.orDie));
    }

    // Keep the same SQLite-backed services across peer reloads by reading them from the
    // persistent runtime context, then provide those services into a new runtime that
    // recreates only the transaction layer.
    const persistedSqlLayer = Layer.unwrapEffect(
      this._persistentRuntime.runtimeEffect.pipe(
        Effect.map((runtime) =>
          Layer.merge(
            Layer.succeed(SqlClient.SqlClient, EffectContext.get(runtime.context, SqlClient.SqlClient)),
            Layer.succeed(SqlExport.SqlExport, EffectContext.get(runtime.context, SqlExport.SqlExport)),
          ),
        ),
      ),
    );

    return ManagedRuntime.make(
      SqlTransaction.layer
        .pipe(Layer.provideMerge(persistedSqlLayer), Layer.provideMerge(Reactivity.layer))
        .pipe(Layer.orDie),
    );
  }

  private _initEcho(): void {
    this._managedRuntime = this._createManagedRuntime();

    this._echoHost = new EchoHost({
      runtime: this._managedRuntime.runtimeEffect,
      assignQueuePositions: this._assignQueuePositions,
    });
    this._clients.clear();
    this._echoClient = new EchoClient();
    this._clients.add(this._echoClient);
    void this._echoClient.graph.registry.add(this._types);
    void this._echoClient.graph.registry.add(this._registry);
  }

  get client() {
    return this._echoClient;
  }

  get host() {
    return this._echoHost;
  }

  protected override async _open(ctx: Context): Promise<void> {
    this._initEcho();
    this._serviceScope = Effect.runSync(Scope.make());
    await this._connectServices(this._echoClient);
    await this._echoHost.open(ctx);
    await this._echoClient.open(ctx);
  }

  /**
   * Bridges the host's effect-rpc Handlers to the effect-rpc client surface in-process (no wire),
   * and connects the given client. The bridged clients live on {@link _serviceScope}.
   */
  private async _connectServices(client: EchoClient): Promise<void> {
    invariant(this._serviceScope, 'Service scope not initialized');
    const [dataService, queryService, feedService] = await EffectEx.runPromise(
      Effect.all([
        makeInProcessClient(DataService.Rpcs, this._echoHost.dataService),
        makeInProcessClient(QueryService.Rpcs, this._echoHost.queryService),
        makeInProcessClient(FeedService.Rpcs, this._echoHost.feedService),
      ]).pipe(Effect.provideService(Scope.Scope, this._serviceScope)),
    );
    client.connectToService({ dataService, queryService, feedService });
  }

  protected override async _close(ctx: Context): Promise<void> {
    for (const client of this._clients) {
      await client.close(ctx);
      client.disconnectFromService();
    }
    await this._echoHost.close(ctx);
    if (this._serviceScope) {
      await EffectEx.runPromise(Scope.close(this._serviceScope, Exit.void));
      this._serviceScope = undefined;
    }
    await this._managedRuntime.dispose();
    // _persistentRuntime is intentionally preserved here so that data survives close()/open() cycles.
    // EchoTestBuilder._close() calls disposeStorage() for final cleanup.
  }

  /** Disposes the underlying SQLite storage. Called by EchoTestBuilder after all peers are closed. */
  async disposeStorage(): Promise<void> {
    if (this._persistentRuntime != null) {
      await this._persistentRuntime.dispose();
      this._persistentRuntime = undefined;
    }
  }

  /** Reads a persistent metadata value from the SQLite storage (key-value table). */
  async getStorageMetadata(key: string): Promise<string | undefined> {
    invariant(this._persistentRuntime, 'getStorageMetadata requires a storagePath peer');
    await this._persistentRuntime.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE IF NOT EXISTS _test_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
      }),
    );
    const rows = await this._persistentRuntime.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ value: string }>`SELECT value FROM _test_metadata WHERE key = ${key}`;
      }),
    );
    return rows.length > 0 ? rows[0].value : undefined;
  }

  /** Writes a persistent metadata value to the SQLite storage (key-value table). */
  async setStorageMetadata(key: string, value: string): Promise<void> {
    invariant(this._persistentRuntime, 'setStorageMetadata requires a storagePath peer');
    await this._persistentRuntime.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE IF NOT EXISTS _test_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
        yield* sql`INSERT OR REPLACE INTO _test_metadata (key, value) VALUES (${key}, ${value})`;
      }),
    );
  }

  /**
   * Simulates a reload of the process by re-creation ECHO.
   */
  async reload(): Promise<void> {
    await this.close();
    await this.open();
  }

  async createClient(): Promise<EchoClient> {
    const client = new EchoClient();
    await client.graph.registry.add(this._types);
    this._clients.add(client);
    await this._connectServices(client);
    await client.open();
    return client;
  }

  async createDatabase(
    spaceKey: PublicKey = PublicKey.random(),
    { client = this.client, reactiveSchemaQuery, preloadSchemaOnOpen }: OpenDatabaseOptions = {},
    // TODO(burdon): Return Promise<EchoDatabase>
  ) {
    // NOTE: Client closes the database when it is closed.
    const root = await this.host.createSpaceRoot(this._ctx, spaceKey);
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const db = client.constructDatabase({
      spaceId,
      spaceKey,
      reactiveSchemaQuery,
      preloadSchemaOnOpen,
      branchStore: this._branchStoreFor(String(spaceId)),
    });
    await db.setSpaceRoot(root.url);
    await db.open();

    this._lastDatabaseSpaceKey = spaceKey;
    this._lastDatabaseRootUrl = root.url;
    if (this._storagePath) {
      await this.setStorageMetadata('lastDatabaseSpaceKey', spaceKey.toHex());
      await this.setStorageMetadata('lastDatabaseRootUrl', root.url);
    }

    return db;
  }

  async openDatabase(
    spaceKey: PublicKey,
    rootUrl?: string,
    { client = this.client, reactiveSchemaQuery, preloadSchemaOnOpen }: OpenDatabaseOptions = {},
    // TODO(burdon): Return Promise<EchoDatabase>
  ) {
    // NOTE: Client closes the database when it is closed.
    const spaceId = await createIdFromSpaceKey(spaceKey);
    let resolvedRootUrl = rootUrl;
    if (resolvedRootUrl) {
      await this.host.updateSpaceRoot(this._ctx, spaceId, resolvedRootUrl as AutomergeUrl);
    } else {
      await this.host.openSpaceRoot(this._ctx, spaceId);
      resolvedRootUrl = this.host.spaces.find((s) => s.spaceId === spaceId)?.rootDocUrl;
      invariant(resolvedRootUrl, 'Root URL not found on host');
    }
    const db = client.constructDatabase({
      spaceId,
      spaceKey,
      reactiveSchemaQuery,
      preloadSchemaOnOpen,
      branchStore: this._branchStoreFor(String(spaceId)),
    });
    await db.setSpaceRoot(resolvedRootUrl);
    await db.open();

    this._lastDatabaseSpaceKey = spaceKey;
    this._lastDatabaseRootUrl = resolvedRootUrl;
    if (this._storagePath) {
      await this.setStorageMetadata('lastDatabaseSpaceKey', spaceKey.toHex());
      await this.setStorageMetadata('lastDatabaseRootUrl', resolvedRootUrl);
    }

    return db;
  }

  async openLastDatabase({ client = this.client, reactiveSchemaQuery, preloadSchemaOnOpen }: OpenDatabaseOptions = {}) {
    if (this._storagePath && (!this._lastDatabaseSpaceKey || !this._lastDatabaseRootUrl)) {
      const storedKeyHex = await this.getStorageMetadata('lastDatabaseSpaceKey');
      const storedUrl = await this.getStorageMetadata('lastDatabaseRootUrl');
      if (storedKeyHex && storedUrl) {
        this._lastDatabaseSpaceKey = PublicKey.fromHex(storedKeyHex);
        this._lastDatabaseRootUrl = storedUrl;
      }
    }
    const spaceKey = this._lastDatabaseSpaceKey;
    const rootUrl = this._lastDatabaseRootUrl;
    invariant(spaceKey, 'lastDatabaseSpaceKey not set');
    invariant(rootUrl, 'lastDatabaseRootUrl not set');
    return this.openDatabase(spaceKey, rootUrl, {
      client,
      reactiveSchemaQuery,
      preloadSchemaOnOpen,
    });
  }

  async exportSqliteDatabase(): Promise<Uint8Array> {
    invariant(this._managedRuntime);
    return await this._managedRuntime.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlExport.SqlExport;
        return yield* sql.export;
      }),
    );
  }
}

export const createDataAssertion = ({
  referenceEquality = false,
  onlyObject = true,
  numObjects = 1,
}: { referenceEquality?: boolean; onlyObject?: boolean; numObjects?: number } = {}) => {
  let seedObjects: Obj.Any[];
  const findSeedObject = async (db: EchoDatabase) => {
    const objects = await db.query(Query.select(Filter.everything())).run();
    const received = seedObjects.map((seedObject) => objects.find((object) => object.id === seedObject.id));
    return { objects, received };
  };

  return {
    seed: async (db: EchoDatabase) => {
      seedObjects = range(numObjects).map((idx) =>
        db.add(Obj.make(TestSchema.Expando, { type: 'task', title: 'A', idx })),
      );
      await db.flush();
    },
    waitForReplication: (db: EchoDatabase) => {
      return waitForCondition({
        breakOnError: true,
        condition: async () => {
          const { received } = await findSeedObject(db);
          return received.every((obj) => obj != null);
        },
      });
    },
    verify: async (db: EchoDatabase) => {
      const { objects } = await findSeedObject(db);
      if (onlyObject) {
        invariant(objects.length === numObjects);
      }

      for (const seedObject of seedObjects) {
        const received = objects.find((object) => object.id === seedObject.id);

        invariant(
          isEqual({ ...received }, { ...seedObject }),
          [
            'Objects are not equal',
            `Received: ${JSON.stringify(received, null, 2)}`,
            `Expected: ${JSON.stringify(seedObject, null, 2)}`,
          ].join('\n'),
        );
        if (referenceEquality) {
          invariant(received === seedObject);
        }
      }
    },
  };
};
