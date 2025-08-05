//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { schema } from '@dxos/protocols/proto';
import { type DashboardService } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { type ProtoRpcPeer, type RpcPort, createProtoRpcPeer } from '@dxos/rpc';

type ServiceBundle = {
  DashboardService: DashboardService;
};

const CHANNEL_NAME = 'dxos.org/agent/plugin/dashboard';

export class DashboardProxy {
  private readonly client: Client;
  private readonly _rpc: ProtoRpcPeer<ServiceBundle>;

  constructor({ client }: { client: Client }) {
    this.client = client;

    this._rpc = createProtoRpcPeer<ServiceBundle>({
      requested: {
        DashboardService: schema.getService('dxos.agent.dashboard.DashboardService'),
      },
      exposed: {},
      handlers: {},
      noHandshake: true,
      port: getGossipRPCPort({ space: this.client.spaces.default, channelName: CHANNEL_NAME }),
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

const getGossipRPCPort = ({ space, channelName }: { space: Space; channelName: string }): RpcPort => ({
  send: (message) => space.postMessage(channelName, { '@type': 'google.protobuf.Any', value: message }),
  subscribe: (callback) =>
    space.listen(channelName, (gossipMessage) => {
      return callback(gossipMessage.payload.value);
    }),
});
