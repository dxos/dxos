//
// Copyright 2022 DXOS.org
//

import { type Context } from '@dxos/context';
import { type ServiceBundle } from '@dxos/rpc';

/**
 * Registry of operational services.
 */
export class ServiceRegistry<Services> {
  // prettier-ignore
  constructor (
    private readonly _serviceBundle: ServiceBundle<Services>,
    private _handlers: Partial<Services> = {}
  ) {}

  get descriptors() {
    return this._serviceBundle;
  }

  get services() {
    return this._handlers;
  }

  setServices(ctx: Context, services: Partial<Services>): void {
    this._handlers = services;
  }

  addService(ctx: Context, name: keyof Services, service: Services[keyof Services]): void {
    this._handlers[name] = service;
  }

  removeService(ctx: Context, name: keyof Services): void {
    delete this._handlers[name];
  }
}
