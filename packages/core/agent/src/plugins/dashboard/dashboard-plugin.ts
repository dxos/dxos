//
// Copyright 2023 DXOS.org
//

import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import yaml from 'yaml';

import { type Space } from '@dxos/client/echo';
import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { AgentStatus, type PluginState, type DashboardService } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { createProtoRpcPeer, type ProtoRpcPeer, type RpcPort } from '@dxos/rpc';

import { AbstractPlugin } from '../plugin';

type Options = Required<Runtime.Agent.Plugins.Dashboard>;

const DEFAULT_OPTIONS: Options = {
  enabled: true,
};

export const CHANNEL_NAME = 'dxos.agent.dashboard-plugin';

export type ServiceBundle = {
  DashboardService: DashboardService;
};

export type DashboardPluginParams = {
  configPath: string;
};

export class DashboardPlugin extends AbstractPlugin {
  public readonly id = 'dashboard';
  private readonly _ctx = new Context();
  private _options?: Options;
  private _rpc?: ProtoRpcPeer<ServiceBundle>;

  constructor(private readonly _params: DashboardPluginParams) {
    super();
  }

  async open(): Promise<void> {
    log('Opening dashboard plugin...');

    invariant(this._pluginCtx);

    this._options = { ...DEFAULT_OPTIONS, ...this._pluginConfig };

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
            changePluginConfig: (msg) => this._handleChangePluginConfig(msg),
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

    this.statusUpdate.emit();
    this._ctx.onDispose(() => subscription.unsubscribe());
  }

  async close(): Promise<void> {
    this.statusUpdate.emit();
    void this._ctx.dispose();
  }

  private _handleStatus(): Stream<AgentStatus> {
    log.info('Dashboard status request received.');
    invariant(this._pluginCtx, 'Client is undefined.');

    return new Stream<AgentStatus>(({ ctx, next, close, ready }) => {
      const update = () => {
        next({
          status: AgentStatus.Status.ON,
          memory: {
            free: os.freemem(),
            total: os.totalmem(),
            ramUsage: process.memoryUsage().heapUsed,
          },

          plugins: this._pluginCtx!.plugins.map((plugin) => ({
            pluginId: plugin.id,
            pluginConfig: plugin.config,
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

  private async _handleChangePluginConfig(request: PluginState): Promise<void> {
    // Change config file.
    {
      // Note: After changing the config file, client config and config file will be out of sync until agent restart.
      //       We are changing only config of specific plugin, it should not cause problems.
      const configAsString = await readFile(this._params.configPath, { encoding: 'utf-8' });
      const yamlConfig = yaml.parseDocument(configAsString);
      yamlConfig.setIn(['runtime', 'agent', 'plugins', request.pluginId], request.pluginConfig);
      await writeFile(this._params.configPath, yamlConfig.toString(), { encoding: 'utf-8' });
    }

    // Restart plugin for which config was changed.
    {
      const plugin = this._pluginCtx!.plugins.find((plugin) => plugin.id === request.pluginId);
      invariant(plugin, `Plugin ${request.pluginId} not found.`);
      await plugin.close();
      await plugin.setConfig(request.pluginConfig);
      await plugin.open();
      this.statusUpdate.emit();
    }
  }
}

export const getGossipRPCPort = ({ space, channelName }: { space: Space; channelName: string }): RpcPort => ({
  send: (message) => space.postMessage(channelName, { '@type': 'google.protobuf.Any', value: message }),
  subscribe: (callback) =>
    space.listen(channelName, (gossipMessage) => {
      return callback(gossipMessage.payload.value);
    }),
});
