//
// Copyright 2023 DXOS.org
//

import { type ClientServices } from '@dxos/client-protocol';
import { type Any, type RequestOptions, type ServiceHandler, Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import {
  RpcPeer,
  type RpcPeerOptions,
  type ServiceBundle,
  bufAnyToCodecProtobufAny,
  codecProtobufAnyToBufAny,
  parseMethodName,
} from '@dxos/rpc';
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
        const codecParams = bufAnyToCodecProtobufAny(params);
        const handler = (innerMethod: string, innerParams: Any, handlerOptions?: RequestOptions) =>
          this._getServiceHandler(serviceName).call(innerMethod, innerParams, handlerOptions);

        this._callMetrics.inc(`${serviceName}.${methodName} request`);

        const promise = this._handleCall
          ? this._handleCall(methodName, codecParams, handler, options)
          : Promise.resolve(handler(methodName, codecParams, options));
        return promise.then(codecProtobufAnyToBufAny);
      },
      streamHandler: (method, params, options) => {
        const [serviceName, methodName] = parseMethodName(method);
        const codecParams = bufAnyToCodecProtobufAny(params);
        const handler = (innerMethod: string, innerParams: Any, handlerOptions?: RequestOptions) =>
          this._getServiceHandler(serviceName).callStream(innerMethod, innerParams, handlerOptions);

        this._callMetrics.inc(`${serviceName}.${methodName} request stream`);

        const innerStream = this._handleStream
          ? Stream.unwrapPromise(this._handleStream(methodName, codecParams, handler, options))
          : handler(methodName, codecParams, options);

        return Stream.map(innerStream, (data) => {
          this._callMetrics.inc(`${serviceName}.${methodName} response stream`);
          return codecProtobufAnyToBufAny(data);
        });
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
