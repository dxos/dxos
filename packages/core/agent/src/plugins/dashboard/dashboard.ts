//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/client';
import { schema } from '@dxos/protocols';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';

import { CHANNEL_NAME, type ServiceBundle } from './dashboard-plugin';
import { getGossipRPCPort } from './utils';

export class Dashboard {
  private readonly client: Client;
  private readonly _rpc: ProtoRpcPeer<ServiceBundle>;

  constructor({ client }: { client: Client }) {
    this.client = client;

    this._rpc = createProtoRpcPeer({
      requested: {
        DashboardService: schema.getService('dxos.agent.dashboard.DashboardService'),
      },
      exposed: {},
      handlers: {},
      noHandshake: true,
      port: getGossipRPCPort({ space: this.client.spaces.default, channelName: CHANNEL_NAME }),
      encodingOptions: {
        preserveAny: true,
      },
    });
  }

  get services(): ServiceBundle {
    return this._rpc.rpc;
  }

  async open(): Promise<void> {
    await this._rpc.open();
  }

  async close(): Promise<void> {
    await this._rpc.close();
  }
}
