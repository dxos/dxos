//
// Copyright 2023 DXOS.org
//

import os from 'node:os';

import { scheduleTaskInterval } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { AgentStatus, type DashboardService } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { createProtoRpcPeer, type ProtoRpcPeer, type RpcPort } from '@dxos/rpc';

import { Plugin } from '../plugin';

export const CHANNEL_NAME = 'dxos.org/agent/plugin/dashboard';

export const UPDATE_INTERVAL = 5_000;

export type ServiceBundle = {
  DashboardService: DashboardService;
};

export class DashboardPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/dashboard';

  private _rpc?: ProtoRpcPeer<ServiceBundle>;
  override async onOpen() {
    const subscription = this.context.client.spaces.isReady.subscribe(async (ready) => {
      if (!ready) {
        return;
      }

      await this.context.client.spaces.default.waitUntilReady();

      this._rpc = createProtoRpcPeer({
        exposed: {
          DashboardService: schema.getService('dxos.agent.dashboard.DashboardService'),
        },
        handlers: {
          DashboardService: {
            status: () => this._handleStatus(),
          },
        },
        noHandshake: true,
        port: getGossipRPCPort({ space: this.context.client.spaces.default, channelName: CHANNEL_NAME }),
      });
      await this._rpc.open();
      this._ctx.onDispose(() => this._rpc!.close());
    });

    this._ctx.onDispose(() => subscription.unsubscribe());
  }

  private _handleStatus(): Stream<AgentStatus> {
    log.info('Dashboard status request received.');

    return new Stream<AgentStatus>(({ ctx, next, close, ready }) => {
      const update = () => {
        next({
          status: AgentStatus.Status.ON,
          memory: {
            free: String(os.freemem()),
            total: String(os.totalmem()),
            ramUsage: String(process.memoryUsage().heapUsed),
          },

          plugins: this.context.plugins?.map((plugin) => ({
            id: plugin.id,
            config: plugin.config,
          })),
        });
      };
      ready();

      this.context.plugins?.forEach((plugin) => {
        plugin.statusUpdate.on(ctx, () => update());
      });

      update();

      scheduleTaskInterval(ctx, async () => update(), UPDATE_INTERVAL);

      this._ctx.onDispose(() => {
        close();
      });
    });
  }
}

export const getGossipRPCPort = ({ space, channelName }: { space: Space; channelName: string }): RpcPort => ({
  send: (message) => space.postMessage(channelName, { '@type': 'google.protobuf.Any', value: message }),
  subscribe: (callback) =>
    space.listen(channelName, (gossipMessage) => {
      return callback(gossipMessage.payload.value);
    }),
});
