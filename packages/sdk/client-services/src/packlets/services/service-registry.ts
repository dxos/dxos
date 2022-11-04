//
// Copyright 2022 DXOS.org
//

import { raise } from '@dxos/debug';
import { ServiceBundle } from '@dxos/rpc';

export type ServiceProvider<T extends {}> = () => T | undefined;

/**
 * Creates a proxy object for the delayed creation of services.
 */
export const createServiceProvider = <T extends {}>(provider: ServiceProvider<T>): T => {
  let value: T;
  return new Proxy<ServiceProvider<T>>(provider, {
    get: (target: ServiceProvider<T>, prop) => {
      if (value === undefined) {
        value = provider() ?? raise(new Error('Value undefined.'));
      }

      const obj: { [i: string | symbol]: any } = value!;
      return obj[prop];
    }
  }) as any as T;
};

/**
 * Registry of operational services.
 */
export class ServiceRegistry<Services> {
  // prettier-ignore
  constructor (
    private readonly _serviceBundle: ServiceBundle<Services>,
    private readonly _handlers: Services
  ) {}

  get descriptors() {
    return this._serviceBundle;
  }

  get services() {
    return this._handlers;
  }
}
