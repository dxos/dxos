//
// Copyright 2022 DXOS.org
//

import { raise } from '@dxos/debug';
import { ServiceBundle } from '@dxos/rpc';

export type ServiceProvider<T extends {}> = () => T | undefined;

/**
 * Creates a delegated lazy-loaded service.
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

// TODO(burdon): Test service delegation pattern.
// export const createServiceProvider = <T extends {}>(
//   descriptor: ServiceDescriptor<T>,
//   provider: ServiceProvider<T>
// ): T => {
//   const methods: Record<string, any> = {};
//   for (const method of descriptor.serviceProto.methodsArray) {
//     methods[method.name] = (request: unknown) => {
//       const service = provider();
//       if (!service) {
//         throw new Error('Service not available.');
//       }
//
//       return (service[method.name as keyof T] as any)(request);
//     };
//   }
//
//   return methods as T;
// };

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
