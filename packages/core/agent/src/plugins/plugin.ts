//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client, type Config } from '@dxos/client';
import { type ClientServicesProvider, type LocalClientServices } from '@dxos/client/services';
import { type ClientServicesHost } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';

export const getPluginConfig = (config: Config, id: string): Runtime.Agent.Plugin | undefined => {
  return config.values.runtime?.agent?.plugins?.find((plugin) => plugin.id === id);
};

// TODO(burdon): Rename?
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

  // TODO(burdon): Event type (e.g., open/close).
  public readonly statusUpdate = new Event();

  protected readonly _ctx = new Context();
  private _pluginCtx?: PluginContext;
  private _config!: Runtime.Agent.Plugin;

  get config(): Runtime.Agent.Plugin {
    return this._config;
  }

  get context(): PluginContext {
    invariant(this._pluginCtx, `Plugin not initialized: ${this.id}`);
    return this._pluginCtx;
  }

  get host(): ClientServicesHost {
    return (this.context.clientServices as LocalClientServices).host ?? failUndefined();
  }

  // TODO(burdon): Remove Client dependency (client services only).
  async initialize(pluginCtx: PluginContext): Promise<void> {
    log(`initializing: ${this.id}`);
    this._pluginCtx = pluginCtx;

    // TODO(burdon): Require config.
    const config = getPluginConfig(this._pluginCtx.client.config, this.id);
    invariant(config, `Plugin not configured: ${this.id}`);
    this._config = config;
  }

  async open() {
    // Currently not re-entrant.
    invariant(!this._ctx.disposed, `Plugin closed: ${this.id}`);

    // Check not disabled.
    if (!(this._config.enabled ?? true)) {
      throw new Error(`Plugin not configured: ${this.id}`);
    }

    log(`opening: ${this.id}`);
    await this.onOpen();
    this.statusUpdate.emit();
    log(`opened: ${this.id}`);
  }

  async close() {
    invariant(!this._ctx.disposed, `Plugin closed: ${this.id}`);
    log(`closing: ${this.id}`);
    await this.onClose();
    void this._ctx.dispose();
    this.statusUpdate.emit();
    log(`closed: ${this.id}`);
  }

  protected async onOpen(): Promise<void> {}
  protected async onClose(): Promise<void> {}
}
