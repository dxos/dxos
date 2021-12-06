//
// Copyright 2021 DXOS.org
//

import { promiseTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { schema } from './proto/gen';
import { BotFactoryService } from './proto/gen/dxos/bot';

export class BotFactoryClient {
  private readonly _rpc: ProtoRpcClient<BotFactoryService>;

  constructor (port: RpcPort) {
    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotFactoryService'),
      {
        port,
        timeout: 60000
      }
    );
  }

  get botFactory (): BotFactoryService {
    return this._rpc.rpc;
  }

  async start (): Promise<void> {
    await this._rpc.open();
  }

  stop () {
    this._rpc.close();
  }
}

export const createBotFactoryClient = async (networkManager: NetworkManager, topic: PublicKey) => {
  const clientPromise = new Promise((resolve) => {
    networkManager.joinProtocolSwarm({
      topic,
      peerId: topic,
      topology: new StarTopology(topic),
      protocol: createProtocolFactory(topic, topic, [new PluginRpc(async (port) => {
        const controller = new BotFactoryClient(port);
        await controller.start();
        resolve(controller);
      })])
    })
  })

  const client = await promiseTimeout(clientPromise, 10000, 'Timeout on connecting to bot factory');

  return client;
}
