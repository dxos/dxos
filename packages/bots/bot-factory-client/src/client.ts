//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { promiseTimeout } from '@dxos/async';
import type { Party } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { createProtocolFactory, NetworkManager, StarTopology, SwarmConnection } from '@dxos/network-manager';
import { RpcPlugin } from '@dxos/protocol-plugin-rpc';
import { schema } from '@dxos/protocols';
import { BotFactoryService, BotPackageSpecifier } from '@dxos/protocols/proto/dxos/bot';
import { createRpcClient, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { BotHandle } from './handle';

const log = debug('dxos:bot-factory-client');

/**
 * BotFactory client.
 */
export class BotFactoryClient {
  private _rpcClient?: ProtoRpcPeer<BotFactoryService>;
  private _connection?: SwarmConnection;
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
  async start(topic: PublicKey): Promise<void> {
    log('connecting', { topic });

    const portPromise = new Promise<RpcPort>((resolve) => {
      const peerId = PublicKey.random();
      this._connection = await this._networkManager
        .openSwarmConnection({
          topic,
          peerId,
          topology: new StarTopology(topic),
          protocol: createProtocolFactory(topic, peerId, [
            new RpcPlugin(async (port) => {
              log('Connected.');
              resolve(port);
            })
          ])
        })
        .catch((err) => log(err));
    });

    // TODO(burdon): Retry.
    // TODO(yivlad): Convert promiseTimeout to typescript.
    const port = await promiseTimeout(portPromise, 30_000, new Error('Timeout on connecting to bot factory.'));

    const service = schema.getService('dxos.bot.BotFactoryService');
    this._rpcClient = createRpcClient(service, { port, timeout: 60_000 });
    await this._rpcClient.open();

    this._isReady = true;
    log('connected', { topic });
  }

  async stop() {
    if (this._connection) {
      log('stopping...');
      await this._rpcClient?.close();
      await this._connection.close();
      this._connection = undefined;
      log('stopped');
    }

    this._isReady = false;
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
      partyKey: party.key,
      invitation: invitation.descriptor.toProto()
    });

    return new BotHandle(id!, this._rpcClient);
  }
}
