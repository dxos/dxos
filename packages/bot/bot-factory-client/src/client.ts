//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { promiseTimeout } from '@dxos/async';
import type { Party } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { BotHandle } from './handle';
import { schema } from './proto/gen';
import { BotFactoryService, BotPackageSpecifier } from './proto/gen/dxos/bot';

const log = debug('dxos:bot-factory-client');

/**
 * BotFactory client.
 */
export class BotFactoryClient {
  private _rpc?: ProtoRpcClient<BotFactoryService>;
  private _connectedTopic?: PublicKey;

  constructor (
    private readonly _networkManager: NetworkManager
  ) {}

  // TODO(burdon): Remove?
  get botFactory (): BotFactoryService {
    assert(this._rpc, 'Not started.'); // TODO(burdon): Remove.
    return this._rpc.rpc;
  }

  // TODO(burdon): Remove?
  getBot (id: string) {
    assert(this._rpc, 'Not started.');
    return new BotHandle(id, this._rpc);
  }

  // TODO(burdon): Rename listBots?
  async list () {
    assert(this._rpc, 'Not started.');
    const { bots } = await this._rpc.rpc.getBots();
    return bots || [];
  }

  // TODO(burdon): Rename connect/disconnect?
  async start (topic: PublicKey): Promise<void> {
    log(`Connecting: ${topic.toString()}`);
    this._connectedTopic = topic;
    const peerId = PublicKey.random();
    const portPromise = new Promise<RpcPort>((resolve) => {
      this._networkManager.joinProtocolSwarm({
        topic,
        peerId,
        topology: new StarTopology(topic),
        protocol: createProtocolFactory(topic, peerId, [new PluginRpc(async (port) => {
          log('Connected.');
          resolve(port);
        })])
      });
    });

    // TODO(yivlad): Convert promiseTimeout to typescript.
    const port = await promiseTimeout(portPromise, 10000, new Error('Timeout on connecting to bot factory.'));
    const service = schema.getService('dxos.bot.BotFactoryService');
    this._rpc = createRpcClient(service, { port, timeout: 60000 });
    await this._rpc.open();
  }

  async stop () {
    log('Disconnecting...');
    this._rpc?.close();
    if (this._connectedTopic) {
      await this._networkManager.leaveProtocolSwarm(this._connectedTopic);
      log('Disconnected.');
    }
  }

  // TODO(burdon): Auto-start?
  async spawn (spec: BotPackageSpecifier, party: Party) {
    assert(this._rpc, 'Not started.');
    const invitation = await party.createInvitation();
    const { id } = await this._rpc.rpc.spawnBot({
      package: spec,
      partyKey: party.key,
      invitation: invitation.descriptor.toProto()
    });

    return new BotHandle(id!, this._rpc);
  }
}
