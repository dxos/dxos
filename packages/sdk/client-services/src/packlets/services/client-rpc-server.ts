//
// Copyright 2023 DXOS.org
//

import { type ClientServices } from '@dxos/client-protocol';
import { Stream } from '@dxos/codec-protobuf';
import { type DescService, type GenService, type GenServiceMethods } from '@dxos/protocols/buf';
import { type Rpc } from '@dxos/protocols';
import { raise } from '@dxos/debug';
import { BufServiceHandler, RpcPeer, type RpcPeerOptions, parseMethodName } from '@dxos/rpc';
import { MapCounter, trace } from '@dxos/tracing';
import { type MaybePromise } from '@dxos/util';

import { type ServiceRegistry } from './service-registry';

export type ClientRpcServerProps = {
  serviceRegistry: ServiceRegistry<ClientServices>;
  handleCall?: (
    method: string,
    params: Rpc.BufAny,
    handler: (method: string, params: Rpc.BufAny) => MaybePromise<Rpc.BufAny>,
  ) => Promise<Rpc.BufAny>;
  handleStream?: (
    method: string,
    params: Rpc.BufAny,
    handler: (method: string, params: Rpc.BufAny) => Stream<Rpc.BufAny>,
  ) => MaybePromise<Stream<Rpc.BufAny>>;
} & Omit<RpcPeerOptions, 'callHandler' | 'streamHandler'>;

@trace.resource()
export class ClientRpcServer {
  private readonly _serviceRegistry: ServiceRegistry<ClientServices>;
  private readonly _rpcPeer: RpcPeer;
  private readonly _handlerCache = new Map<string, BufServiceHandler<GenService<GenServiceMethods>>>();
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
      callHandler: (method, params) => {
        const [serviceName, methodName] = parseMethodName(method);
        const handler = (method: string, params: Rpc.BufAny) =>
          this._getServiceHandler(serviceName).call(method, params);

        this._callMetrics.inc(`${serviceName}.${methodName} request`);

        if (this._handleCall) {
          return this._handleCall(methodName, params as Rpc.BufAny, handler);
        } else {
          return handler(methodName, params as Rpc.BufAny);
        }
      },
      streamHandler: (method, params) => {
        const [serviceName, methodName] = parseMethodName(method);
        const handler = (method: string, params: Rpc.BufAny) =>
          this._getServiceHandler(serviceName).callStream(method, params);

        this._callMetrics.inc(`${serviceName}.${methodName} request stream`);

        if (this._handleStream) {
          return Stream.map(
            Stream.unwrapPromise(this._handleStream(methodName, params as Rpc.BufAny, handler)),
            (data) => {
              this._callMetrics.inc(`${serviceName}.${methodName} response stream`);
              return data;
            },
          );
        } else {
          return handler(methodName, params as Rpc.BufAny);
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

  private _getServiceHandler(serviceName: string): BufServiceHandler<GenService<GenServiceMethods>> {
    if (!this._handlerCache.has(serviceName)) {
      const [key, descriptor] =
        Object.entries(this._serviceRegistry.descriptors).find(
          ([_key, descriptor]) => (descriptor as DescService).typeName === serviceName,
        ) ?? raise(new Error(`Service not available: ${serviceName}`));

      const service = this._serviceRegistry.services[key as keyof ClientServices] as any;
      if (!service) {
        throw new Error(`Service not available: ${serviceName}`);
      }

      this._handlerCache.set(
        serviceName,
        new BufServiceHandler(descriptor as GenService<GenServiceMethods> & DescService, service),
      );
    }

    return this._handlerCache.get(serviceName)!;
  }
}
