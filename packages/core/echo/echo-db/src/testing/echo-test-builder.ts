//
// Copyright 2024 DXOS.org
//

import { type Context, Resource } from '@dxos/context';
import { type LevelDB } from '@dxos/echo-pipeline';
import { createTestLevel } from '@dxos/echo-pipeline/testing';
import { type Storage, StorageType, createStorage } from '@dxos/random-access-storage';

import { EchoClient } from '../client';
import { EchoHost } from '../host';
import { PublicKey } from '@dxos/keys';

export class EchoTestBuilder extends Resource {
  private readonly _peers: EchoTestPeer[] = [];

  protected override async _close(ctx: Context): Promise<void> {
    await Promise.all(this._peers.map((peer) => peer.close(ctx)));
  }

  async createPeer(): Promise<EchoTestPeer> {
    const peer = new EchoTestPeer();
    this._peers.push(peer);
    await peer.open();
    return peer;
  }
}

/**
 * Generic options on a test method for a peer.
 */
export type PeerMethodOptions = {
  client?: EchoClient;
};

export class EchoTestPeer extends Resource {
  private readonly _kv: LevelDB;
  private readonly _storage: Storage;
  private readonly _echoHost: EchoHost;
  private readonly _echoClient: EchoClient;
  private readonly _clients = new Set<EchoClient>();

  constructor() {
    super();

    this._kv = createTestLevel();
    this._storage = createStorage({ type: StorageType.RAM });
    this._echoHost = new EchoHost({
      kv: this._kv,
      storage: this._storage,
    });
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
    await this._storage.close();
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

  async createDatabase(spaceKey: PublicKey, { client = this.client }: PeerMethodOptions = {}) {
    const rootUrl = await this.host.createSpaceRoot(spaceKey);
    const db = client.constructDatabase({ spaceKey });
    await db.setSpaceRoot(rootUrl);
    await db.open();

    // Sticking to a pattern of [mainResult, { ...secondaryResults }]
    return [db, { rootUrl }] as const;
  }

  async openDatabase(spaceKey: PublicKey, rootUrl: string, { client = this.client }: PeerMethodOptions = {}) {
    const db = client.constructDatabase({ spaceKey });
    await db.setSpaceRoot(rootUrl);
    await db.open();

    // Sticking to a pattern of [mainResult, { ...secondaryResults }]
    return [db] as const;
  }
}
