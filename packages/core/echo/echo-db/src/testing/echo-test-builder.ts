//
// Copyright 2024 DXOS.org
//

import type { AutomergeUrl } from '@automerge/automerge-repo';
import * as Reactivity from '@effect/experimental/Reactivity';
import type * as SqlClient from '@effect/sql/SqlClient';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Schema from 'effect/Schema';
import isEqual from 'lodash.isequal';

import { waitForCondition } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { EchoHost, type EchoHostIndexingConfig } from '@dxos/echo-pipeline';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { range } from '@dxos/util';

import { EchoClient } from '../client';
import { type AnyLiveObject } from '../echo-handler';
import { type EchoDatabase } from '../proxy-db';
import { Filter, Query } from '../query';
import { MockQueueService } from '../queue';

type OpenDatabaseOptions = {
  client?: EchoClient;
  reactiveSchemaQuery?: boolean;
  preloadSchemaOnOpen?: boolean;
};

type PeerOptions = {
  indexing?: Partial<EchoHostIndexingConfig>;
  types?: Schema.Schema.AnyNoContext[];
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
  private readonly _indexing: Partial<EchoHostIndexingConfig>;
  private readonly _types: Schema.Schema.AnyNoContext[];
  private readonly _clients = new Set<EchoClient>();
  private _queuesService = new MockQueueService();
  private _echoHost!: EchoHost;
  private _echoClient!: EchoClient;
  private _lastDatabaseSpaceKey?: PublicKey = undefined;
  private _lastDatabaseRootUrl?: string = undefined;

  private _managedRuntime!: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;

  constructor({ kv = createTestLevel(), indexing = {}, types }: PeerOptions) {
    super();
    this._kv = kv;
    this._indexing = indexing;
    this._types = types ?? [];
  }

  private _initEcho(): void {
    this._echoHost = new EchoHost({
      kv: this._kv,
      indexing: this._indexing,
      runtime: this._managedRuntime.runtimeEffect,
    });
    this._clients.delete(this._echoClient);
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
    this._managedRuntime = ManagedRuntime.make(Layer.merge(layerMemory, Reactivity.layer).pipe(Layer.orDie));
    this._initEcho();
    this._echoClient.connectToService({
      dataService: this._echoHost.dataService,
      queryService: this._echoHost.queryService,
      queueService: this._queuesService,
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
    await client.graph.schemaRegistry.register(this._types);
    this._clients.add(client);
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
}

export const createDataAssertion = ({
  referenceEquality = false,
  onlyObject = true,
  numObjects = 1,
}: { referenceEquality?: boolean; onlyObject?: boolean; numObjects?: number } = {}) => {
  let seedObjects: AnyLiveObject<any>[];
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
