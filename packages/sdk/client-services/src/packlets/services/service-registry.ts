//
// Copyright 2022 DXOS.org
//

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

  setServices(services: Partial<Services>): void {
    this._handlers = services;
  }

  addService(name: keyof Services, service: Services[keyof Services]): void {
    this._handlers[name] = service;
  }

  removeService(name: keyof Services): void {
    delete this._handlers[name];
  }
}
