import { Context, Resource } from '@dxos/context';
import { EchoHost } from '../host';
import { EchoClient } from '../client';
import { LevelDB } from '@dxos/echo-pipeline';
import { Storage, StorageType, createStorage } from '@dxos/random-access-storage';
import { PublicKey } from '@dxos/keys';
import { Level } from 'level';

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

export class EchoTestPeer extends Resource {
  private readonly _kv: LevelDB;
  private readonly _storage: Storage;
  private readonly _echoHost: EchoHost;
  private readonly _echoClient: EchoClient;

  constructor() {
    super();

    this._kv = new Level<string, string>(`/tmp/dxos-${PublicKey.random().toHex()}`);
    this._storage = createStorage({ type: StorageType.RAM });
    this._echoHost = new EchoHost({
      kv: this._kv,
      storage: this._storage,
    });
    this._echoClient = new EchoClient({});
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
      // TODO(dmaretskyi): ???.
      // queryService: this._echoHost.queryService,
    });
    await this._echoHost.open(ctx);
    await this._echoClient.open(ctx);
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._echoClient.close(ctx);
    this._echoClient.disconnectFromService();
    await this._echoHost.close(ctx);

    await this._kv.close();
    await this._storage.close();
  }
}
