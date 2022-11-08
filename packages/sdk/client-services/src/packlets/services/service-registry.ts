//
// Copyright 2022 DXOS.org
//

import { ServiceDescriptor } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { ServiceBundle } from '@dxos/rpc';

export type ServiceProvider<T extends {}> = () => T;

/**
 * Creates a proxy for a service, that will be lazily loaded on the first request.
 * The returned instance will be cached and reused for further requests.
 */
export const createLazyLoadedService = <T extends {}>(
  descriptor: ServiceDescriptor<T>,
  provider: ServiceProvider<T>
): T => {
  let instance!: T;

  const methods: Record<string, any> = {};
  for (const method of descriptor.serviceProto.methodsArray) {
    methods[method.name] = (request: unknown) => {
      instance ??= provider();
      return (instance[method.name as keyof T] as any)(request);
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
