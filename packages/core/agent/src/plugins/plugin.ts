//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type ClientServicesProvider, type LocalClientServices } from '@dxos/client/services';
import { type ClientServicesHost } from '@dxos/client-services';
import { failUndefined } from '@dxos/debug';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';

export type PluginContext = {
  client: Client;
  clientServices: ClientServicesProvider;
  plugins: Plugin[];
};

export abstract class Plugin {
  /**
   * Unique plugin identifier. Should be equal to the value in DXOS yaml config file.
   */
  public abstract readonly id: string;

  public readonly statusUpdate = new Event();
  protected _config!: Runtime.Agent.Plugin;
  protected _pluginCtx?: PluginContext;

  get host(): ClientServicesHost {
    return (this._pluginCtx!.clientServices as LocalClientServices).host ?? failUndefined();
  }

  get config(): Runtime.Agent.Plugin {
    return this._config;
  }

  // TODO(burdon): Remove Client dependency (client services only).
  async initialize(pluginCtx: PluginContext): Promise<void> {
    this._pluginCtx = pluginCtx;

    // TODO(mykola): Maybe do not pass config directly to plugin, but rather let plugin to request it through some callback.
    await this.setConfig(
      this._pluginCtx.client.config.values.runtime?.agent?.plugins?.find((pluginCtx) => pluginCtx.id === this.id) ?? {
        id: this.id,
      },
    );
  }

  async setConfig(config: Runtime.Agent.Plugin) {
    this._config = config;
  }

  abstract open(): Promise<void>;
  abstract close(): Promise<void>;
}
