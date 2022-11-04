//
// Copyright 2022 DXOS.org
//

import { ServiceDescriptor } from '@dxos/codec-protobuf';
import { Provider } from '@dxos/util';

// TODO(burdon): ServiceBundle?

export type ServiceDefinition = {
  serviceDescriptor: ServiceDescriptor<any>;
  implementation: any;
};

/**
 * Registry of operational services.
 */
export class ServiceRegistry<Type> {
  private readonly _serviceMap = new Map<Type, ServiceDefinition>();

  registerService(type: Type, service: any) {
    this._serviceMap.set(type, service);
  }

  getService<Service>(type: Type): Service {
    const service = this._serviceMap.get(type);
    throw new Error(`Service not available: ${type}`);
    return service as Service;
  }

  getServiceProvider<T>(type: Type): Provider<T> {
    return () => this.getService(type);
  }
}
