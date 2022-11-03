//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { asyncTimeout } from '@dxos/async';
import type { Party } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { BotFactoryService, BotPackageSpecifier } from '@dxos/protocols/proto/dxos/bot';
import { createRpcClient, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { BotHandle } from './handle';

const log = debug('dxos:bot-factory-client');

/**
 * BotFactory client.
 * @deprecated
 */
export class BotFactoryClient {
  private _topic?: PublicKey;
  private _rpcClient?: ProtoRpcPeer<BotFactoryService>;
  private _isReady = false;

  constructor(private readonly _networkManager: NetworkManager) {}

  get isReady() {
    return this._isReady;
  }

  // TODO(burdon): Remove
  get botFactory(): BotFactoryService {
    assert(this._rpcClient, 'Not started.'); // TODO(burdon): Remove.
    return this._rpcClient.rpc;
  }

  getBot(id: string) {
    assert(this._rpcClient, 'Not started.');
    return new BotHandle(id, this._rpcClient);
  }

  // TODO(burdon): Rename listBots?
  async getBots() {
    assert(this._rpcClient, 'Not started.');
    const { bots } = await this._rpcClient.rpc.getBots();
    return bots || [];
  }

  // TODO(burdon): Rename connect/disconnect?
  async start(topic: PublicKey) {
    log('connecting...', { topic });

    // TODO(burdon): Retry?
    // TODO(yivlad): Convert asyncTimeout to typescript.
    this._topic = topic;
    const peerId = PublicKey.random();
    const port = await asyncTimeout(
      new Promise<RpcPort>((resolve) => {
        void this._networkManager.openSwarmConnection({
          topic,
          peerId,
          topology: new StarTopology(topic),
          protocol: createProtocolFactory(topic, peerId, [
            new RpcPlugin(async (port) => {
              log('Connected.');
              resolve(port);
            })
          ])
        });
      }),
      30_000,
      'Connecting to swarm.'
    );

    const service = schema.getService('dxos.bot.BotFactoryService');
    this._rpcClient = createRpcClient(service, { port, timeout: 60_000 });
    await this._rpcClient.open();
    this._isReady = true;
    log('connected', { topic });
  }

  async stop() {
    if (this._rpcClient) {
      log('stopping...');
      await this._rpcClient.close();
      await this._networkManager.closeSwarmConnection(this._topic!);
      this._rpcClient = undefined;
      this._topic = undefined;
      this._isReady = false;
      log('stopped');
    }
  }

  /**
   * Spawns a bot and starts it.
   * @deprecated
   */
  async spawn(spec: BotPackageSpecifier, party: Party) {
    if (!this._rpcClient) {
      await this.start(party.key);
      assert(this._rpcClient, 'Not started.');
    }

    const invitation = await party.createInvitation();
    const { id } = await this._rpcClient.rpc.spawnBot({
      package: spec,
      spaceKey: party.key,
      invitation: invitation.descriptor.toProto()
    });

    return new BotHandle(id!, this._rpcClient);
  }
}
