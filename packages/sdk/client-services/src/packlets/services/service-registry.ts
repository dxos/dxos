//
// Copyright 2022 DXOS.org
//

import { type GenService, type GenServiceMethods } from '@dxos/protocols/buf';
import { type Rpc } from '@dxos/protocols';

/**
 * Registry of operational services.
 */
export class ServiceRegistry<
  Services,
  Descriptors extends Record<string, GenService<GenServiceMethods>> = Record<string, GenService<GenServiceMethods>>,
> {
  // prettier-ignore
  constructor (
    private readonly _serviceBundle: Rpc.BufServiceBundle<Descriptors>,
    private _handlers: Partial<Services> = {}
  ) {}

  get descriptors(): Rpc.BufServiceBundle<Descriptors> {
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
