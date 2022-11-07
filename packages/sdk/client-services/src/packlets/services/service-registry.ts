//
// Copyright 2022 DXOS.org
//

import { ServiceDescriptor } from '@dxos/codec-protobuf';
import { ServiceBundle } from '@dxos/rpc';

export type ServiceProvider<T extends {}> = () => T | undefined;

/**
 * Creates a delegated lazy-loaded service.
 */
export const createLazyService = <T extends {}>(descriptor: ServiceDescriptor<T>, provider: ServiceProvider<T>): T => {
  const methods: Record<string, any> = {};
  for (const method of descriptor.serviceProto.methodsArray) {
    methods[method.name] = (request: unknown) => {
      const service = provider();
      if (!service) {
        throw new Error('Service not available.');
      }

      return (service[method.name as keyof T] as any)(request);
    };
  }

  return methods as T;
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
