//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { promiseTimeout } from '@dxos/async';
import type { PartyProxy, Client } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { createProtocolFactory, NetworkManager, StarTopology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { generateInvitation } from './generate-invitation';
import { schema } from './proto/gen';
import { BotFactoryService, BotPackageSpecifier } from './proto/gen/dxos/bot';

export class BotHandle {
  constructor (
    private readonly _id: string,
    private _rpc: ProtoRpcClient<BotFactoryService>
  ) {}

  async start () {
    await this._rpc.rpc.Start({
      id: this._id
    });
  }

  async stop () {
    await this._rpc.rpc.Stop({
      id: this._id
    });
  }

  async remove () {
    await this._rpc.rpc.Remove({
      id: this._id
    });
  }

  async sendCommand (command: Uint8Array) {
    const { response } = await this._rpc.rpc.SendCommand({
      botId: this._id,
      command
    });
    return response;
  }
}

export class BotFactoryClient {
  private _rpc: ProtoRpcClient<BotFactoryService> | undefined;

  constructor (private readonly _networkManager: NetworkManager) {}

  get botFactory (): BotFactoryService {
    assert(this._rpc, 'Bot factory client is not started');
    return this._rpc.rpc;
  }

  async start (topic: PublicKey): Promise<void> {
    const peerId = PublicKey.random();
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
    const port = (await promiseTimeout(portPromise, 10000, 'Timeout on connecting to bot factory')) as RpcPort;
    this._rpc = createRpcClient(
      schema.getService('dxos.bot.BotFactoryService'),
      {
        port,
        timeout: 60000
      }
    );
    await this._rpc.open();
  }

  stop () {
    this._rpc?.close();
  }

  async spawn (pkg: BotPackageSpecifier, client: Client, party: PartyProxy) {
    assert(this._rpc, 'Bot factory client is not started');
    const invitation = await generateInvitation(client, party);
    const { id } = await this._rpc.rpc.SpawnBot({
      package: pkg,
      invitation
    });
    assert(id);
    const handle = new BotHandle(id, this._rpc);
    return handle;
  }
}
