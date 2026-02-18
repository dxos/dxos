//
// Copyright 2024 DXOS.org
//

import type { AutomergeUrl } from '@automerge/automerge-repo';
import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import isEqual from 'lodash.isequal';

import { waitForCondition } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { type Obj, type Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EchoHost } from '@dxos/echo-pipeline';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { range } from '@dxos/util';

import { EchoClient } from '../client';
import { type EchoDatabase } from '../proxy-db';
import { Filter, Query } from '../query';

type OpenDatabaseOptions = {
  client?: EchoClient;
  reactiveSchemaQuery?: boolean;
  preloadSchemaOnOpen?: boolean;
};

type PeerOptions = {
  types?: Type.Entity.Any[];
  assignQueuePositions?: boolean;

  kv?: LevelDB;
};

export class EchoTestBuilder extends Resource {
  private readonly _peers: EchoTestPeer[] = [];

  get lastPeer(): EchoTestPeer | undefined {
    return this._peers.at(-1);
  }

  protected override async _close(ctx: Context): Promise<void> {
    await Promise.all(this._peers.map((peer) => peer.close(ctx)));
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
      queues: peer.client.constructQueueFactory(db.spaceId),
    };
  }
}

export class EchoTestPeer extends Resource {
  private readonly _kv: LevelDB;
  private readonly _types: Type.Entity.Any[];
  private readonly _assignQueuePositions?: boolean;
  private readonly _clients = new Set<EchoClient>();
  private _echoHost!: EchoHost;
  private _echoClient!: EchoClient;
  private _lastDatabaseSpaceKey?: PublicKey = undefined;
  private _lastDatabaseRootUrl?: string = undefined;

  private _persistentRuntime?: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient | SqlExport.SqlExport, never>;
  private _managedRuntime!: ManagedRuntime.ManagedRuntime<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction,
    never
  >;
  private _isReloading = false;

  constructor({ kv = createTestLevel(), types, assignQueuePositions }: PeerOptions) {
    super();
    this._kv = kv;
    // Include Expando as default type for tests that use Obj.make(TestSchema.Expando, ...).
    this._types = [TestSchema.Expando, ...(types ?? [])];
    this._assignQueuePositions = assignQueuePositions;
  }

  private _createManagedRuntime(): ManagedRuntime.ManagedRuntime<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction,
    never
  > {
    if (this._persistentRuntime == null) {
      this._persistentRuntime = ManagedRuntime.make(layerMemory.pipe(Layer.orDie));
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
      kv: this._kv,
      runtime: this._managedRuntime.runtimeEffect,
      localQueues: true,
      assignQueuePositions: this._assignQueuePositions,
    });
    this._clients.clear();
    this._echoClient = new EchoClient();
    this._clients.add(this._echoClient);
    void this._echoClient.graph.schemaRegistry.register(this._types);
  }

  get client() {
    return this._echoClient;
  }

  get host() {
    return this._echoHost;
  }

  protected override async _open(ctx: Context): Promise<void> {
    await this._kv.open();
    this._initEcho();
    // Type assertions needed because buf implementations are structurally compatible.
    this._echoClient.connectToService({
      dataService: this._echoHost.dataService,
      queryService: this._echoHost.queryService,
      queueService: this._echoHost.queuesService,
    });
    await this._echoHost.open(ctx);
    await this._echoClient.open(ctx);
  }

  protected override async _close(ctx: Context): Promise<void> {
    for (const client of this._clients) {
      await client.close(ctx);
      client.disconnectFromService();
    }
    await this._echoHost.close(ctx);
    await this._kv.close();
    await this._managedRuntime.dispose();
    if (!this._isReloading && this._persistentRuntime != null) {
      await this._persistentRuntime.dispose();
      this._persistentRuntime = undefined;
    }
  }

  /**
   * Simulates a reload of the process by re-creation ECHO.
   */
  async reload(): Promise<void> {
    this._isReloading = true;
    try {
      await this.close();
      await this.open();
    } finally {
      this._isReloading = false;
    }
  }

  async createClient(): Promise<EchoClient> {
    const client = new EchoClient();
    await client.graph.schemaRegistry.register(this._types);
    this._clients.add(client);
    // Type assertions needed because buf implementations are structurally compatible.
    client.connectToService({
      dataService: this._echoHost.dataService,
      queryService: this._echoHost.queryService,
    });
    await client.open();
    return client;
  }

  async createDatabase(
    spaceKey: PublicKey = PublicKey.random(),
    { client = this.client, reactiveSchemaQuery, preloadSchemaOnOpen }: OpenDatabaseOptions = {},
    // TODO(burdon): Return Promise<EchoDatabase>
  ) {
    // NOTE: Client closes the database when it is closed.
    const root = await this.host.createSpaceRoot(spaceKey);
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const db = client.constructDatabase({ spaceId, spaceKey, reactiveSchemaQuery, preloadSchemaOnOpen });
    await db.setSpaceRoot(root.url);
    await db.open();

    this._lastDatabaseSpaceKey = spaceKey;
    this._lastDatabaseRootUrl = root.url;
    return db;
  }

  async openDatabase(
    spaceKey: PublicKey,
    rootUrl: string,
    { client = this.client, reactiveSchemaQuery, preloadSchemaOnOpen }: OpenDatabaseOptions = {},
    // TODO(burdon): Return Promise<EchoDatabase>
  ) {
    // NOTE: Client closes the database when it is closed.
    const spaceId = await createIdFromSpaceKey(spaceKey);
    await this.host.openSpaceRoot(spaceId, rootUrl as AutomergeUrl);
    const db = client.constructDatabase({ spaceId, spaceKey, reactiveSchemaQuery, preloadSchemaOnOpen });
    await db.setSpaceRoot(rootUrl);
    await db.open();
    return db;
  }

  async openLastDatabase({ client = this.client, reactiveSchemaQuery, preloadSchemaOnOpen }: OpenDatabaseOptions = {}) {
    return this.openDatabase(this._lastDatabaseSpaceKey!, this._lastDatabaseRootUrl!, {
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
      seedObjects = range(numObjects).map((idx) => db.add({ type: 'task', title: 'A', idx } as any));
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
