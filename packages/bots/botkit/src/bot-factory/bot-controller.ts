//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { ServiceDescriptor } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import {
  adaptProtocolProvider,
  createProtocolFactory,
  NetworkManager,
  StarTopology,
  SwarmConnection
} from '@dxos/network-manager';
import { RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { BotFactoryService } from '@dxos/protocols/proto/dxos/bot';
import { createRpcServer, RpcPeer, RpcPort } from '@dxos/rpc';

const log = debug('dxos:botkit:bot-controller');

/**
 * Exposes BotFactoryService for external agents.
 */
export class BotController {
  private readonly _service: ServiceDescriptor<BotFactoryService> = schema.getService('dxos.bot.BotFactoryService');

  private readonly _peers: Map<string, RpcPeer> = new Map();
  private _connection?: SwarmConnection;

  // prettier-ignore
  constructor(
    private _botFactory: BotFactoryService,
    private _networkManager: NetworkManager
  ) {}

  async start(topic: PublicKey): Promise<void> {
    const plugin = new RpcPlugin(this._onPeerConnect.bind(this));
    this._connection = await this._networkManager.joinSwarm({
      topic,
      peerId: topic,
      protocolProvider: adaptProtocolProvider(createProtocolFactory(topic, topic, [plugin])),
      topology: new StarTopology(topic)
    });

    log(`Listening on topic: ${topic}`);
  }

  async close() {
    await this._connection?.close();
  }

  private async _onPeerConnect(port: RpcPort, peerId: string) {
    log(`[${peerId}]: Peer connected`);
    const peer = createRpcServer({
      service: this._service,
      handlers: this._botFactory,
      port
    });

    await peer.open();
    this._peers.set(peerId, peer);

    log(`[${peerId}]: Peer initialized`);
    return async () => {
      this._peers.delete(peerId);
      await peer.close();
      log(`[${peerId}]: Peer disconnected`);
    };
  }
}
