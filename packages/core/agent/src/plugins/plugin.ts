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

// TODO(burdon): Don't need interface and abstract class.
export interface Plugin {
  statusUpdate: Event<void>;

  id: string;

  /**
   * Plugin DXOS config defined in `runtime.agent.plugin.<plugin_id>`. Inside plugin only that config should be used.
   */
  config: Record<string, any>;

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

  protected _pluginCtx?: PluginContext;
  protected _config!: Record<string, any>;

  get host(): ClientServicesHost {
    return (this._pluginCtx!.clientServices as LocalClientServices).host ?? failUndefined();
  }

  get config(): Record<string, any> {
    return this._config;
  }

  // TODO(burdon): Remove Client dependency (client services only).
  async initialize(pluginCtx: PluginContext): Promise<void> {
    this._pluginCtx = pluginCtx;
    await this.setConfig((this._pluginCtx.client.config.values.runtime?.agent?.plugins as any)?.[this.id] ?? {});
  }

  async setConfig(config: Record<string, any>) {
    this._config = config;
  }

  abstract open(): Promise<void>;
  abstract close(): Promise<void>;
}
