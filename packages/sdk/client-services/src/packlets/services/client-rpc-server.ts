//
// Copyright 2023 DXOS.org
//

import { ClientServices } from '@dxos/client-protocol';
import { Any, ServiceHandler, Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { parseMethodName, RpcPeer, RpcPeerOptions } from '@dxos/rpc';
import { MaybePromise } from '@dxos/util';

import { ServiceRegistry } from './service-registry';

export type ClientRpcServerParams = {
  serviceRegistry: ServiceRegistry<ClientServices>;
  handleCall?: (
    method: string,
    params: Any,
    handler: (method: string, params: Any) => MaybePromise<Any>,
  ) => Promise<Any>;
  handleStream?: (
    method: string,
    params: Any,
    handler: (method: string, params: Any) => Stream<Any>,
  ) => MaybePromise<Stream<Any>>;
} & Omit<RpcPeerOptions, 'callHandler' | 'streamHandler'>;

export class ClientRpcServer {
  private readonly _serviceRegistry: ServiceRegistry<ClientServices>;
  private readonly _rpcPeer: RpcPeer;
  private readonly _handlerCache = new Map<string, ServiceHandler<any>>();
  private readonly _handleCall: ClientRpcServerParams['handleCall'];
  private readonly _handleStream: ClientRpcServerParams['handleStream'];

  constructor(params: ClientRpcServerParams) {
    const { serviceRegistry, handleCall, handleStream, ...rpcOptions } = params;
    this._handleCall = handleCall;
    this._handleStream = handleStream;

    this._serviceRegistry = serviceRegistry;
    this._rpcPeer = new RpcPeer({
      ...rpcOptions,
      callHandler: (method, params) => {
        const [serviceName, methodName] = parseMethodName(method);
        const handler = (method: string, params: Any) => this._getServiceHandler(serviceName).call(method, params);

        if (this._handleCall) {
          return this._handleCall(methodName, params, handler);
        } else {
          return handler(methodName, params);
        }
      },
      streamHandler: (method, params) => {
        const [serviceName, methodName] = parseMethodName(method);
        const handler = (method: string, params: Any) =>
          this._getServiceHandler(serviceName).callStream(method, params);

        if (this._handleStream) {
          return Stream.unwrapPromise(this._handleStream(methodName, params, handler));
        } else {
          return handler(methodName, params);
        }
      },
    });
  }

  async open() {
    await this._rpcPeer.open();
  }

  async close() {
    await this._rpcPeer.close();
  }

  private _getServiceHandler(serviceName: string) {
    if (!this._handlerCache.has(serviceName)) {
      const [key, descriptor] =
        Object.entries(this._serviceRegistry.descriptors).find(
          ([key, descriptor]) => descriptor.name === serviceName,
        ) ?? raise(new Error(`Service not available: ${serviceName}`));

      const service = this._serviceRegistry.services[key as keyof ClientServices];
      if (!service) {
        throw new Error(`Service not available: ${serviceName}`);
      }

      this._handlerCache.set(serviceName, descriptor.createServer(service as any));
    }

    return this._handlerCache.get(serviceName)!;
  }
}
