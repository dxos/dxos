//
// Copyright 2023 DXOS.org
//

import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import yaml from 'yaml';

import { scheduleTaskInterval } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { AgentStatus, type PluginState, type DashboardService } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { createProtoRpcPeer, type ProtoRpcPeer, type RpcPort } from '@dxos/rpc';

import { Plugin } from '../plugin';

export const CHANNEL_NAME = 'dxos.org/agent/plugin/dashboard';
export const UPDATE_INTERVAL = 5_000;

export type ServiceBundle = {
  DashboardService: DashboardService;
};

export type DashboardPluginParams = {
  configPath: string;
};

export class DashboardPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/dashboard';

  private _rpc?: ProtoRpcPeer<ServiceBundle>;

  constructor(private readonly _params: DashboardPluginParams) {
    super();
  }

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
            changePluginConfig: (msg) => this._handleChangePluginConfig(msg),
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

          plugins: this.context.plugins.map((plugin) => ({
            id: plugin.id,
            config: plugin.config,
          })),
        });
      };
      ready();

      this.context.plugins.forEach((plugin) => {
        plugin.statusUpdate.on(ctx, () => update());
      });

      update();

      scheduleTaskInterval(ctx, async () => update(), UPDATE_INTERVAL);

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
      const plugins = yamlConfig.getIn(['runtime', 'agent', 'plugins']);
      if (!plugins) {
        yamlConfig.setIn(['runtime', 'agent', 'plugins'], [request.config]);
      } else if (plugins instanceof yaml.YAMLSeq) {
        plugins.delete(plugins.items.findIndex((item) => item.get('id') === request.id));
        plugins.add(request.config);
        yamlConfig.setIn(['runtime', 'agent', 'plugins'], plugins);
      }
      await writeFile(this._params.configPath, yamlConfig.toString(), { encoding: 'utf-8' });
    }

    // Restart plugin for which config was changed.
    {
      const plugin = this.context.plugins.find((plugin) => plugin.id === request.id);
      invariant(plugin, `Plugin ${request.id} not found.`);
      await plugin.close();
      plugin.setConfig(request.config);
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
