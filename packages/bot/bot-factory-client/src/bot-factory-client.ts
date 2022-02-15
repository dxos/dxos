//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { promiseTimeout } from '@dxos/async';
import type { Party } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { schema } from './proto/gen';
import { BotFactoryService, BotPackageSpecifier } from './proto/gen/dxos/bot';

export class BotHandle {
  constructor (
    private readonly _id: string,
    private _rpc: ProtoRpcClient<BotFactoryService>
  ) {}

  async start () {
    await this._rpc.rpc.start({
      id: this._id
    });
  }

  async stop () {
    await this._rpc.rpc.stop({
      id: this._id
    });
  }

  async remove () {
    await this._rpc.rpc.remove({
      id: this._id
    });
  }

  async sendCommand (command: Uint8Array) {
    const { response } = await this._rpc.rpc.sendCommand({
      botId: this._id,
      command
    });
    return response;
  }

  logsStream () {
    return this._rpc.rpc.getLogs({
      botId: this._id
    });
  }
}

export class BotFactoryClient {
  private _rpc: ProtoRpcClient<BotFactoryService> | undefined;
  private _connectedTopic: PublicKey | undefined;

  constructor (private readonly _networkManager: NetworkManager) {}

  get botFactory (): BotFactoryService {
    assert(this._rpc, 'Bot factory client is not started');
    return this._rpc.rpc;
  }

  async start (topic: PublicKey): Promise<void> {
    const peerId = PublicKey.random();
    this._connectedTopic = topic;
    const portPromise = new Promise<RpcPort>((resolve) => {
      this._networkManager.joinProtocolSwarm({
        topic,
        peerId,
        topology: new StarTopology(topic),
        protocol: createProtocolFactory(topic, topic, [new PluginRpc(async (port) => {
          resolve(port);
        })])
      });
    });
    // TODO(yivlad): convert promiseTimeout to typescript.
    const port = await promiseTimeout(portPromise, 10000, new Error('Timeout on connecting to bot factory'));
    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotFactoryService'),
      {
        port,
        timeout: 60000
      }
    );
    await this._rpc.open();
  }

  async stop () {
    this._rpc?.close();
    if (this._connectedTopic) {
      await this._networkManager.leaveProtocolSwarm(this._connectedTopic);
    }
  }

  async spawn (pkg: BotPackageSpecifier, party: Party) {
    assert(this._rpc, 'Bot factory client is not started');
    const invitation = await party.createInvitation();
    const { id } = await this._rpc.rpc.spawnBot({
      package: pkg,
      invitation: invitation.descriptor.toProto()
    });
    assert(id);
    const handle = new BotHandle(id, this._rpc);
    return handle;
  }

  async list () {
    assert(this._rpc, 'Bot factory client is not started');
    const { bots } = await this._rpc.rpc.getBots();
    return bots || [];
  }

  async get (id: string) {
    assert(this._rpc, 'Bot factory client is not started');
    const bots = await this.list();
    const bot = bots.find((bot) => bot.id === id);
    if (!bot?.id) {
      throw new Error(`Bot ${id} not found`);
    }
    return new BotHandle(bot.id, this._rpc);
  }
}
