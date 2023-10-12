//
// Copyright 2023 DXOS.org
//

//
// Copyright 2023 DXOS.org
//

import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DashboardResponse } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { AbstractPlugin } from '../plugin';

type Options = Required<Runtime.Agent.Plugins.Dashboard>;

const DEFAULT_OPTIONS: Options = {
  enabled: true,
};

export const CHANNEL_NAME = 'dxos.agent.dashboard-plugin';

export class DashboardPlugin extends AbstractPlugin {
  private readonly _ctx = new Context();
  private _options?: Options = undefined;

  async open(): Promise<void> {
    log('Opening dashboard plugin...');

    invariant(this._pluginCtx);
    const config = this._pluginCtx.client.config.values.runtime?.agent?.plugins?.indexing;

    this._options = { ...DEFAULT_OPTIONS, ...config };

    const subscription = this._pluginCtx.client.spaces.isReady.subscribe(async (ready) => {
      if (!ready) {
        return;
      }
      invariant(this._pluginCtx);
      await this._pluginCtx.client.spaces.default.waitUntilReady();
      const unsubscribe = this._pluginCtx.client.spaces.default.listen(CHANNEL_NAME, (msg) =>
        this._handleDashboardRequest(msg),
      );
      this._ctx.onDispose(unsubscribe);
    });

    this._ctx.onDispose(() => subscription.unsubscribe());

    if (!this._options.enabled) {
      log.info('dashboard disabled');
    }
  }

  async close(): Promise<void> {
    void this._ctx.dispose();
  }

  private async _handleDashboardRequest(message: GossipMessage) {
    if (message.payload['@type'] !== 'dxos.agent.dashboard.DashboardRequest') {
      return;
    }

    invariant(this._pluginCtx, 'Client is undefined.');

    await this._pluginCtx.client?.spaces.isReady.wait();
    await this._pluginCtx.client.spaces.default.waitUntilReady();
    await this._pluginCtx.client.spaces.default.postMessage(CHANNEL_NAME, {
      '@type': 'dxos.agent.dashboard.DashboardResponse',
      status: DashboardResponse.Status,
      plugins: this._pluginCtx.plugins.map((plugin) => ({
        name: Object.getPrototypeOf(plugin).constructor.name,
        status: 'OK',
      })),
    });
  }
}
