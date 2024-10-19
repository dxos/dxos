//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { waitForCondition } from '@dxos/async';
import type { AutomergeUrl } from '@dxos/automerge/automerge-repo';
import { type Context, Resource } from '@dxos/context';
import { EchoHost } from '@dxos/echo-pipeline';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { range } from '@dxos/util';

import { EchoClient } from '../client';
import { type EchoReactiveObject } from '../echo-handler';
import { type EchoDatabase } from '../proxy-db';

export class EchoTestBuilder extends Resource {
  private readonly _peers: EchoTestPeer[] = [];

  protected override async _close(ctx: Context): Promise<void> {
    await Promise.all(this._peers.map((peer) => peer.close(ctx)));
  }

  async createPeer(kv?: LevelDB): Promise<EchoTestPeer> {
    const peer = new EchoTestPeer(kv);
    this._peers.push(peer);
    await peer.open();
    return peer;
  }

  /**
   * Shorthand for creating a peer and a database.
   */
  async createDatabase(kv?: LevelDB) {
    const peer = await this.createPeer(kv);
    const db = await peer.createDatabase(PublicKey.random());
    return { db, graph: db.graph, host: peer.host, crud: db.coreDatabase };
  }
}

export class EchoTestPeer extends Resource {
  private readonly _clients = new Set<EchoClient>();
  private _echoHost!: EchoHost;
  private _echoClient!: EchoClient;

  constructor(private readonly _kv: LevelDB = createTestLevel()) {
    super();
    this._initEcho();
  }

  private _initEcho() {
    this._echoHost = new EchoHost({ kv: this._kv });
    this._clients.delete(this._echoClient);
    this._echoClient = new EchoClient({});
    this._clients.add(this._echoClient);
  }

  get client() {
    return this._echoClient;
  }

  get host() {
    return this._echoHost;
  }

  protected override async _open(ctx: Context): Promise<void> {
    await this._kv.open();

    this._echoClient.connectToService({
      dataService: this._echoHost.dataService,
      queryService: this._echoHost.queryService,
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
  }

  /**
   * Simulates a reload of the process by re-creation ECHO.
   */
  async reload() {
    await this.close();
    this._initEcho();
    await this.open();
  }

  async createClient() {
    const client = new EchoClient({});
    this._clients.add(client);
    client.connectToService({
      dataService: this._echoHost.dataService,
      queryService: this._echoHost.queryService,
    });
    await client.open();
    return client;
  }

  async createDatabase(spaceKey: PublicKey, { client = this.client }: { client?: EchoClient } = {}) {
    const root = await this.host.createSpaceRoot(spaceKey);
    // NOTE: Client closes the database when it is closed.
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const db = client.constructDatabase({ spaceId, spaceKey });
    await db.setSpaceRoot(root.url);
    await db.open();
    return db;
  }

  async openDatabase(spaceKey: PublicKey, rootUrl: string, { client = this.client }: { client?: EchoClient } = {}) {
    // NOTE: Client closes the database when it is closed.
    const spaceId = await createIdFromSpaceKey(spaceKey);
    await this.host.openSpaceRoot(spaceId, rootUrl as AutomergeUrl);
    const db = client.constructDatabase({ spaceId, spaceKey });
    await db.setSpaceRoot(rootUrl);
    await db.open();
    return db;
  }
}

export const createDataAssertion = ({
  referenceEquality = false,
  onlyObject = true,
  numObjects = 1,
}: { referenceEquality?: boolean; onlyObject?: boolean; numObjects?: number } = {}) => {
  let seedObjects: EchoReactiveObject<any>[];
  const findSeedObject = async (db: EchoDatabase) => {
    const { objects } = await db.query().run();
    const received = seedObjects.map((seedObject) => objects.find((object) => object.id === seedObject.id));
    return { objects, received };
  };

  return {
    seed: async (db: EchoDatabase) => {
      seedObjects = range(numObjects).map((idx) => db.add({ type: 'task', title: 'A', idx }));
      await db.flush();
    },
    waitForReplication: (db: EchoDatabase) => {
      return waitForCondition({
        condition: async () => (await findSeedObject(db)).received.every((obj) => obj != null),
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
