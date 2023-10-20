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
  initialize(pluginCtx: PluginContext): Promise<void>;
  open(): Promise<void>;
  close(): Promise<void>;
}

export abstract class AbstractPlugin implements Plugin {
  public id: string = this.constructor.name.replace(/^[A-Z]/, (letter) => `${letter.toLowerCase()}`);
  public statusUpdate = new Event();
  protected _pluginCtx?: PluginContext;

  get host(): ClientServicesHost {
    return (this._pluginCtx!.clientServices as LocalClientServices).host ?? failUndefined();
  }

  // TODO(burdon): Remove Client dependency (client services only).
  async initialize(pluginCtx: PluginContext): Promise<void> {
    this._pluginCtx = pluginCtx;
  }

  abstract open(): Promise<void>;
  abstract close(): Promise<void>;
}
