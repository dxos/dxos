import { ClientServices } from "@dxos/client";
import { ServiceDescriptor, ServiceHandler } from "@dxos/codec-protobuf";
import { raise } from "@dxos/debug";
import { parseMethodName, RpcPeer, RpcPeerOptions } from "@dxos/rpc";
import { ServiceRegistry } from "./service-registry";

export class ClientRpcServer {
  private readonly _rpcPeer: RpcPeer;

  private readonly _handlerCache = new Map<string, ServiceHandler<any>>();

  constructor(
    private readonly _serviceRegistry: ServiceRegistry<ClientServices>,
    private readonly _rpcOptions: Exclude<RpcPeerOptions, 'callHandler' | 'streamHandler'>,
  ) {
    this._rpcPeer = new RpcPeer({
      ...this._rpcOptions,
      callHandler: (method, params) => {
        const [serviceName, methodName] = parseMethodName(method);
        const service = this._getServiceHandler(serviceName);
        return service.call(methodName, params);
      },
      streamHandler: (method, params) => {
        const [serviceName, methodName] = parseMethodName(method);
        const service = this._getServiceHandler(serviceName);
        return service.callStream(methodName, params);
      }
    });
  }

  async open() {
    await this._rpcPeer.open();
  }

  async close() {
    await this._rpcPeer.close();
  }

  private _getServiceHandler(serviceName: string) {
    if(!this._handlerCache.has(serviceName)) {
      const [key,descriptor] = (Object.values(this._serviceRegistry.descriptors) as any as [string, ServiceDescriptor<any>][])
        .find(([key, descriptor]) => descriptor.name === serviceName) ?? raise(new Error(`Service not available: ${serviceName}`));

      const service = this._serviceRegistry.services[key as keyof ClientServices];
      if (!service) {
        throw new Error(`Service not available: ${serviceName}`)
      }

      this._handlerCache.set(serviceName, descriptor.createServer(service));
    }
     
    return this._handlerCache.get(serviceName)!;
  }
}