//
// Copyright 2023 DXOS.org
//

import { type ClientServices } from '@dxos/client-protocol';
import { type Any, type RequestOptions, type ServiceHandler, Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { RpcPeer, type RpcPeerOptions, type ServiceBundle, parseMethodName } from '@dxos/rpc';
import { MapCounter, trace } from '@dxos/tracing';
import { type MaybePromise } from '@dxos/util';

import { type ServiceRegistry } from './service-registry';

export type ClientRpcServerProps = {
  serviceRegistry: ServiceRegistry<ClientServices>;
  handleCall?: (
    method: string,
    params: Any,
    handler: (method: string, params: Any, options?: RequestOptions) => MaybePromise<Any>,
    options?: RequestOptions,
  ) => Promise<Any>;
  handleStream?: (
    method: string,
    params: Any,
    handler: (method: string, params: Any, options?: RequestOptions) => Stream<Any>,
    options?: RequestOptions,
  ) => MaybePromise<Stream<Any>>;
} & Omit<RpcPeerOptions, 'callHandler' | 'streamHandler'>;

@trace.resource()
export class ClientRpcServer {
  private readonly _serviceRegistry: ServiceRegistry<ClientServices>;
  private readonly _rpcPeer: RpcPeer;
  private readonly _handlerCache = new Map<string, ServiceHandler<any>>();
  private readonly _handleCall: ClientRpcServerProps['handleCall'];
  private readonly _handleStream: ClientRpcServerProps['handleStream'];

  @trace.metricsCounter()
  private readonly _callMetrics = new MapCounter();

  @trace.info()
  private get _services() {
    return Object.keys(this._serviceRegistry.services);
  }

  constructor(params: ClientRpcServerProps) {
    const { serviceRegistry, handleCall, handleStream, ...rpcOptions } = params;
    this._handleCall = handleCall;
    this._handleStream = handleStream;

    this._serviceRegistry = serviceRegistry;
    this._rpcPeer = new RpcPeer({
      ...rpcOptions,
      callHandler: (method, params, options) => {
        const [serviceName, methodName] = parseMethodName(method);
        const handler = (method: string, params: Any, handlerOptions?: RequestOptions) =>
          this._getServiceHandler(serviceName).call(method, params, handlerOptions);

        this._callMetrics.inc(`${serviceName}.${methodName} request`);

        if (this._handleCall) {
          return this._handleCall(methodName, params, handler, options);
        } else {
          return handler(methodName, params, options);
        }
      },
      streamHandler: (method, params, options) => {
        const [serviceName, methodName] = parseMethodName(method);
        const handler = (method: string, params: Any, handlerOptions?: RequestOptions) =>
          this._getServiceHandler(serviceName).callStream(method, params, handlerOptions);

        this._callMetrics.inc(`${serviceName}.${methodName} request stream`);

        if (this._handleStream) {
          return Stream.map(Stream.unwrapPromise(this._handleStream(methodName, params, handler, options)), (data) => {
            this._callMetrics.inc(`${serviceName}.${methodName} response stream`);
            return data;
          });
        } else {
          return handler(methodName, params, options);
        }
      },
    });
  }

  async open(): Promise<void> {
    await this._rpcPeer.open();
  }

  async close(): Promise<void> {
    await this._rpcPeer.close();
  }

  private _getServiceHandler(serviceName: string) {
    if (!this._handlerCache.has(serviceName)) {
      const [key, descriptor] =
        Object.entries(this._serviceRegistry.descriptors as ServiceBundle<Record<string, any>>).find(
          ([key, descriptor]) => descriptor.name === serviceName,
        ) ?? raise(new Error(`Service not available: ${serviceName}`));

      const service = this._serviceRegistry.services[key as keyof ClientServices] as any;
      if (!service) {
        throw new Error(`Service not available: ${serviceName}`);
      }

      this._handlerCache.set(serviceName, descriptor.createServer(service));
    }

    return this._handlerCache.get(serviceName)!;
  }
}
