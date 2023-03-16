//
// Copyright 2022 DXOS.org
//

import { ServiceBundle } from '@dxos/rpc';

/**
 * Registry of operational services.
 */
export class ServiceRegistry<Services> {
  private _handlers: Partial<Services> = {}
  // prettier-ignore
  constructor (
    private readonly _serviceBundle: ServiceBundle<Services>,
  ) {}

  get descriptors() {
    return this._serviceBundle;
  }

  get services() {
    return this._handlers;
  }

  addService(name: keyof Services, service: Services[keyof Services]) {
    this._handlers[name] = service;
  }

  removeService(name: keyof Services) {
    delete this._handlers[name];
  }
}
