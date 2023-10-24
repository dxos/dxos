//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { schema } from '@dxos/protocols';
import { type DashboardService } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { createProtoRpcPeer, type RpcPort, type ProtoRpcPeer } from '@dxos/rpc';

type ServiceBundle = {
  DashboardService: DashboardService;
};

const CHANNEL_NAME = 'dxos.agent.dashboard-plugin';

export class DashboardProxy {
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

const getGossipRPCPort = ({ space, channelName }: { space: Space; channelName: string }): RpcPort => ({
  send: (message) => space.postMessage(channelName, { '@type': 'google.protobuf.Any', value: message }),
  subscribe: (callback) =>
    space.listen(channelName, (gossipMessage) => {
      return callback(gossipMessage.payload.value);
    }),
});
