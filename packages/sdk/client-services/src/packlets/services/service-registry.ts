//
// Copyright 2022 DXOS.org
//

/**
 * Registry of operational services.
 */
export class ServiceRegistry<Services> {
  constructor(private _handlers: Partial<Services> = {}) {}

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
