//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { ServiceDescriptor } from '@dxos/codec-protobuf';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { PublicKey } from '@dxos/protocols';
import { createRpcServer, RpcPeer, RpcPort } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { BotFactoryService } from '../proto/gen/dxos/bot';

const log = debug('dxos:botkit:bot-controller');

/**
 * Exposes BotFactoryService for external agents.
 */
export class BotController {
  private readonly _service: ServiceDescriptor<BotFactoryService> = schema.getService('dxos.bot.BotFactoryService');
  private readonly _peers: Map<string, RpcPeer> = new Map();

  constructor (private _botFactory: BotFactoryService, private _networkManager: NetworkManager) {}

  async start (topic: PublicKey): Promise<void> {
    const plugin = new PluginRpc(this._onPeerConnect.bind(this));
    this._networkManager.joinProtocolSwarm({
      topic,
      peerId: topic,
      protocol: createProtocolFactory(
        topic,
        topic,
        [plugin]
      ),
      topology: new StarTopology(topic)
    });

    log(`Listening on topic: ${topic}`);
  }

  private async _onPeerConnect (port: RpcPort, peerId: string) {
    log(`[${peerId}]: Peer connected`);
    const peer = createRpcServer({
      service: this._service,
      handlers: this._botFactory,
      port
    });
    await peer.open();
    this._peers.set(peerId, peer);
    log(`[${peerId}]: Peer initialized`);
    return () => {
      this._peers.delete(peerId);
      peer.close();
      log(`[${peerId}]: Peer disconnected`);
    };
  }
}
