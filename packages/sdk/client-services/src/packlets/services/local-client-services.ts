//
// Copyright 2023 DXOS.org
//

import { ClientServices, ClientServicesProvider } from '@dxos/client';
import { jsRpcMethodName } from '@dxos/codec-protobuf';
import { ServiceBundle } from '@dxos/rpc';
import { ServiceRegistry } from '.';

import { ClientServicesHost, ClientServicesHostParams } from './service-host';

/**
 * Starts a local instance of the service host.
 */
export class LocalClientServices implements ClientServicesProvider {
  private readonly _host: ClientServicesHost;
  private readonly _services: Partial<ClientServices>;

  constructor(params: ClientServicesHostParams) {
    this._host = new ClientServicesHost(params);
    this._services = createServiceDispatch(this._host.serviceRegistry);
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return this._host.descriptors;
  }

  get services(): Partial<ClientServices> {
    return this._services;
  }

  get host(): ClientServicesHost {
    return this._host;
  }

  async open(): Promise<void> {
    await this._host.open();
  }

  async close(): Promise<void> {
    await this._host.close();
  }
}

/**
 * Creates a service dispatch object where individual services are result at RPC call time.
 */
function createServiceDispatch(registry: ServiceRegistry<ClientServices>): Partial<ClientServices> {
  const result: any = {};

  for(const serviceName of Object.keys(registry.descriptors)) {
    result[serviceName] = {};
    for(const method of registry.descriptors[serviceName as keyof ClientServices].serviceProto.methodsArray) {
      const jsMethodName = jsRpcMethodName(method.name);

      const fn = (...args: any[]) => {
        const service = registry.services[serviceName as keyof ClientServices];
        if(!service) {
          throw new Error(`Service not available: ${serviceName}`);
        }
        return (service as any)[jsMethodName](...args);
      }
      Object.defineProperty(fn, 'name', { value: `${serviceName}.${jsMethodName}$dispatch` });
      result[serviceName][jsMethodName] = fn;
    }
  }

  return result;
}