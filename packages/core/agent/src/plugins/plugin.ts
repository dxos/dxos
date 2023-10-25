//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type ClientServicesProvider, type LocalClientServices } from '@dxos/client/services';
import { type ClientServicesHost } from '@dxos/client-services';
import { failUndefined } from '@dxos/debug';

export type PluginContext = {
  client: Client;
  clientServices: ClientServicesProvider;
  plugins: Plugin[];
};

export interface Plugin {
  id: string;
  statusUpdate: Event<void>;

  /**
   * Plugin DXOS config defined in `runtime.agent.plugin.<plugin_id>`. Inside plugin only that config should be used.
   */
  config: Record<string, any>;

  initialize(pluginCtx: PluginContext): Promise<void>;
  setConfig(config: Record<string, any>): Promise<void>;

  open(): Promise<void>;
  close(): Promise<void>;
}

export abstract class AbstractPlugin implements Plugin {
  /**
   * Unique plugin identifier. Should be equal to the value in DXOS yaml config file.
   */
  abstract id: string;
  public statusUpdate = new Event();
  protected _pluginConfig!: Record<string, any>;
  protected _pluginCtx?: PluginContext;

  get host(): ClientServicesHost {
    return (this._pluginCtx!.clientServices as LocalClientServices).host ?? failUndefined();
  }

  get config(): Record<string, any> {
    return this._pluginConfig;
  }

  // TODO(burdon): Remove Client dependency (client services only).
  async initialize(pluginCtx: PluginContext): Promise<void> {
    this._pluginCtx = pluginCtx;
    await this.setConfig((this._pluginCtx.client.config.values.runtime?.agent?.plugins as any)?.[this.id] ?? {});
  }

  async setConfig(config: Record<string, any>) {
    this._pluginConfig = config;
  }

  abstract open(): Promise<void>;
  abstract close(): Promise<void>;
}
