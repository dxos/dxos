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

export type PluginOptions<PluginConfig = {}> = {
  enabled: boolean;
  config?: PluginConfig;
};

export interface Plugin {
  statusUpdate: Event<void>;

  id: string;

  /**
   * Plugin DXOS config defined in `runtime.agent.plugins`. Inside plugin only that config should be used.
   */
  config: Runtime.Agent.Plugin;

  // TODO(burdon): Why are these separate?
  initialize(pluginCtx: PluginContext): Promise<void>;
  setConfig(config: Record<string, any>): Promise<void>;

  open(): Promise<void>;
  close(): Promise<void>;
}

export abstract class AbstractPlugin implements Plugin {
  public readonly statusUpdate = new Event();

  /**
   * Unique plugin identifier. Should be equal to the value in DXOS yaml config file.
   */
  public abstract readonly id: string;
  public statusUpdate = new Event();
  protected _pluginConfig!: Record<string, any>;
  protected _pluginCtx?: PluginContext;
  protected _config!: Record<string, any>;

  get host(): ClientServicesHost {
    return (this._pluginCtx!.clientServices as LocalClientServices).host ?? failUndefined();
  }

  get config(): Runtime.Agent.Plugin {
    return this._pluginConfig;
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
    this._pluginConfig = config;
  }

  abstract open(): Promise<void>;
  abstract close(): Promise<void>;
}
