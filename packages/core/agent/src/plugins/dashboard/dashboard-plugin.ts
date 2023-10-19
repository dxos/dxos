//
// Copyright 2023 DXOS.org
//

//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { AgentStatus, type DashboardService } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';

import { getGossipRPCPort } from './utils';
import { AbstractPlugin } from '../plugin';

type Options = Required<Runtime.Agent.Plugins.Dashboard>;

const DEFAULT_OPTIONS: Options = {
  enabled: true,
};

export const CHANNEL_NAME = 'dxos.agent.dashboard-plugin';

export type ServiceBundle = {
  DashboardService: DashboardService;
};

export class DashboardPlugin extends AbstractPlugin {
  private readonly _ctx = new Context();
  private _options?: Options = undefined;
  private _rpc?: ProtoRpcPeer<ServiceBundle>;

  async open(): Promise<void> {
    log('Opening dashboard plugin...');

    invariant(this._pluginCtx);
    const config = this._pluginCtx.client.config.values.runtime?.agent?.plugins?.search;

    this._options = { ...DEFAULT_OPTIONS, ...config };

    if (!this._options.enabled) {
      log.info('Dashboard disabled.');
      return;
    }

    const subscription = this._pluginCtx.client.spaces.isReady.subscribe(async (ready) => {
      if (!ready) {
        return;
      }
      invariant(this._pluginCtx);
      await this._pluginCtx.client.spaces.default.waitUntilReady();

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
        port: getGossipRPCPort({ space: this._pluginCtx.client.spaces.default, channelName: CHANNEL_NAME }),
        encodingOptions: {
          preserveAny: true,
        },
      });
      await this._rpc.open();
      this._ctx.onDispose(() => this._rpc!.close());
    });

    this._ctx.onDispose(() => subscription.unsubscribe());
  }

  async close(): Promise<void> {
    void this._ctx.dispose();
  }

  private _handleStatus(): Stream<AgentStatus> {
    invariant(this._pluginCtx, 'Client is undefined.');
    return new Stream<AgentStatus>(({ ctx, next, close, ready }) => {
      const update = () => {
        next({
          status: AgentStatus.Status.ON,
          plugins: this._pluginCtx!.plugins.map((plugin) => ({
            name: Object.getPrototypeOf(plugin).constructor.name,
            status: 'OK',
          })),
        });
      };
      ready();

      this._pluginCtx!.plugins.forEach((plugin) => {
        plugin.statusUpdate.on(ctx, () => update());
      });

      update();

      this._ctx.onDispose(() => {
        close();
      });
    });
  }
}
