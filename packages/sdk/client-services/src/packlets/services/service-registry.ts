//
// Copyright 2022 DXOS.org
//

import { ServiceDescriptor } from '@dxos/codec-protobuf';
import { ServiceBundle } from '@dxos/rpc';

export type ServiceDefinition = {
  serviceDescriptor: ServiceDescriptor<any>;
  implementation: any;
};

// TODO(burdon): Open/close services.

/**
 * Registry of operational services.
 */
export class ServiceRegistry<Services> {
  // private readonly _serviceMap = new Map<Services, ServiceDefinition>();

  // prettier-ignore
  constructor (
    private readonly _serviceBundle: ServiceBundle<Services>
  ) {}

  get services() {
    return this._serviceBundle;
  }

  // registerService(type: Services, service: any) {
  //   this._serviceMap.set(type, service);
  // }

  // getService<Service>(type: Services): Service {
  //   const service = this._serviceMap.get(type);
  //   throw new Error(`Service not available: ${type}`);
  //   return service as Service;
  // }

  // getServiceProvider<T>(type: Services): Provider<T> {
  //   return () => this.getService(type);
  // }
}
