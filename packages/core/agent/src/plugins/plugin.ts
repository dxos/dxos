//
// Copyright 2023 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type ClientServicesProvider, type LocalClientServices } from '@dxos/client/services';
import { type ClientServicesHost } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';

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

  public readonly statusUpdate = new Event(); // TODO(burdon): Event type (e.g., open/close).

  protected readonly _ctx = new Context();
  protected readonly _initialized = new Trigger();

  protected _config!: Runtime.Agent.Plugin;
  private _pluginCtx?: PluginContext;

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

  setConfig(config: Runtime.Agent.Plugin) {
    this._config = config;
  }

  // TODO(burdon): Remove Client dependency (client services only).
  async initialize(pluginCtx: PluginContext): Promise<void> {
    this._pluginCtx = pluginCtx;

    // TODO(mykola): Maybe do not pass config directly to plugin, but rather let plugin to request it through some callback.
    this.setConfig(
      this._pluginCtx.client.config.values.runtime?.agent?.plugins?.find((pluginCtx) => pluginCtx.id === this.id) ?? {
        id: this.id,
      },
    );

    this._initialized.wake();
  }

  // TODO(burdon): Check not closed (or create new ctx?)
  async open() {
    if (!this._config.enabled) {
      throw new Error(`Plugin not configured: ${this.id}`);
    }

    log(`opening: ${this.id}`);
    await this.onOpen();
    this.statusUpdate.emit();
  }

  async close() {
    log(`closing: ${this.id}`);
    await this.onClose();
    void this._ctx.dispose();
    this.statusUpdate.emit();
  }

  abstract onOpen(): Promise<void>;
  abstract onClose(): Promise<void>;
}
