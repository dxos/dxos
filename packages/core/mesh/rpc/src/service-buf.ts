//
// Copyright 2021 DXOS.org
//

import type { DescMessage, DescMethod, DescService } from '@bufbuild/protobuf';
import { type Message, type MessageShape, fromBinary, toBinary } from '@bufbuild/protobuf';
import type { GenService, GenServiceMethods } from '@bufbuild/protobuf/codegenv2';

import { Stream } from '@dxos/codec-protobuf/stream';
import { invariant } from '@dxos/invariant';
import { getAsyncProviderValue } from '@dxos/util';

import { RpcPeer, type RpcPeerOptions } from './rpc';

/**
 * Represents a protobuf Any type used for RPC encoding.
 */
export interface BufAny {
  type_url: string;
  value: Uint8Array;
}

/**
 * Request options for RPC calls.
 */
export interface BufRequestOptions {
  timeout?: number;
}

/**
 * Service backend interface for making RPC calls.
 */
export interface BufServiceBackend {
  call(method: string, request: BufAny, requestOptions?: BufRequestOptions): Promise<BufAny>;
  callStream(method: string, request: BufAny, requestOptions?: BufRequestOptions): Stream<BufAny>;
}

/**
 * Service provider can be a service instance, a sync factory, or an async factory.
 */
export type BufServiceProvider<Service> = Service | (() => Service) | (() => Promise<Service>);

/**
 * Extract method definitions from a GenService type.
 */
type ServiceMethods<S extends GenService<GenServiceMethods>> = S extends GenService<infer Methods> ? Methods : never;

/**
 * Get the input message type from a method definition.
 */
type MethodInputType<M> = M extends { input: infer I extends DescMessage } ? MessageShape<I> : never;

/**
 * Get the output message type from a method definition.
 */
type MethodOutputType<M> = M extends { output: infer O extends DescMessage } ? MessageShape<O> : never;

/**
 * Get the client method signature for a unary RPC method.
 */
type UnaryClientMethod<I, O> = (request: I, options?: BufRequestOptions) => Promise<O>;

/**
 * Get the client method signature for a server streaming RPC method.
 */
type StreamingClientMethod<I, O> = (request: I, options?: BufRequestOptions) => Stream<O>;

/**
 * Get the handler signature for a unary RPC method.
 */
type UnaryHandler<I, O> = (request: I, options?: BufRequestOptions) => Promise<O>;

/**
 * Get the handler signature for a server streaming RPC method.
 */
type StreamingHandler<I, O> = (request: I, options?: BufRequestOptions) => Stream<O>;

/**
 * Maps a method definition to its client signature.
 */
type ClientMethodSignature<M> = M extends { methodKind: 'unary' }
  ? UnaryClientMethod<MethodInputType<M>, MethodOutputType<M>>
  : M extends { methodKind: 'server_streaming' }
    ? StreamingClientMethod<MethodInputType<M>, MethodOutputType<M>>
    : never;

/**
 * Maps a method definition to its handler signature.
 */
type HandlerMethodSignature<M> = M extends { methodKind: 'unary' }
  ? UnaryHandler<MethodInputType<M>, MethodOutputType<M>>
  : M extends { methodKind: 'server_streaming' }
    ? StreamingHandler<MethodInputType<M>, MethodOutputType<M>>
    : never;

/**
 * Type for an RPC service client built from a GenService definition.
 */
export type BufRpcClient<S extends GenService<GenServiceMethods>> = {
  [K in keyof ServiceMethods<S>]: ClientMethodSignature<ServiceMethods<S>[K]>;
};

/**
 * Type for RPC service handlers built from a GenService definition.
 */
export type BufRpcHandlers<S extends GenService<GenServiceMethods>> = {
  [K in keyof ServiceMethods<S>]: HandlerMethodSignature<ServiceMethods<S>[K]>;
};

/**
 * Map of service definitions.
 */
export type BufServiceBundle<Services extends Record<string, GenService<GenServiceMethods>>> = Services;

/**
 * Map of service handlers.
 */
export type BufServiceHandlers<Services extends Record<string, GenService<GenServiceMethods>>> = {
  [K in keyof Services]: BufServiceProvider<BufRpcHandlers<Services[K]>>;
};

/**
 * Creates a client for a buf service.
 */
const createBufClient = <S extends GenService<GenServiceMethods>>(
  service: S & DescService,
  backend: BufServiceBackend,
): BufRpcClient<S> => {
  const client: Record<string, unknown> = {};

  for (const [methodName, methodDef] of Object.entries(service.method)) {
    const descMethod = methodDef as DescMethod;
    const { methodKind, input, output } = descMethod;
    const rpcMethodName = descMethod.name;

    if (methodKind === 'server_streaming') {
      client[methodName] = (request: Message, options?: BufRequestOptions): Stream<Message> => {
        const encoded = toBinary(input, request);
        const stream = backend.callStream(
          rpcMethodName,
          {
            value: encoded,
            type_url: input.typeName,
          },
          options,
        );
        return Stream.map(stream, (data) => fromBinary(output, data.value));
      };
    } else {
      // unary
      client[methodName] = async (request: Message, options?: BufRequestOptions): Promise<Message> => {
        const encoded = toBinary(input, request);
        const response = await backend.call(
          rpcMethodName,
          {
            value: encoded,
            type_url: input.typeName,
          },
          options,
        );
        return fromBinary(output, response.value);
      };
    }

    // Set function name for better stack traces.
    Object.defineProperty(client[methodName], 'name', {
      value: methodName,
    });
  }

  return client as BufRpcClient<S>;
};

/**
 * Handler implementation for a buf service.
 */
class BufServiceHandler<S extends GenService<GenServiceMethods>> implements BufServiceBackend {
  constructor(
    private readonly _service: S & DescService,
    private readonly _handlers: BufServiceProvider<BufRpcHandlers<S>>,
  ) {}

  /**
   * Handle a unary RPC call.
   */
  async call(methodName: string, request: BufAny, options?: BufRequestOptions): Promise<BufAny> {
    const mappedMethodName = methodName[0].toLowerCase() + methodName.slice(1);
    const descMethod = this._service.method[mappedMethodName] as DescMethod | undefined;
    invariant(descMethod, `Method not found: ${methodName}`);
    invariant(
      descMethod.methodKind !== 'server_streaming',
      `Invalid RPC method call: ${methodName} is a streaming method.`,
    );

    const { input, output } = descMethod;
    const requestDecoded = fromBinary(input, request.value);
    const handler = await this._getHandler(mappedMethodName);
    const response = await handler(requestDecoded, options);
    const responseEncoded = toBinary(output, response as Message);

    return {
      value: responseEncoded,
      type_url: output.typeName,
    };
  }

  /**
   * Handle a streaming RPC call.
   */
  callStream(methodName: string, request: BufAny, options?: BufRequestOptions): Stream<BufAny> {
    const mappedMethodName = methodName[0].toLowerCase() + methodName.slice(1);
    const descMethod = this._service.method[mappedMethodName] as DescMethod | undefined;
    invariant(descMethod, `Method not found: ${methodName}`);
    invariant(
      descMethod.methodKind === 'server_streaming',
      `Invalid RPC method call: ${methodName} is not a streaming method.`,
    );

    const { input, output } = descMethod;
    const requestDecoded = fromBinary(input, request.value);
    const handlerPromise = this._getHandler(mappedMethodName);

    const responseStream = Stream.unwrapPromise(
      handlerPromise.then((handler) => handler(requestDecoded, options) as Stream<Message>),
    );

    return Stream.map(
      responseStream,
      (data): BufAny => ({
        value: toBinary(output, data),
        type_url: output.typeName,
      }),
    );
  }

  private async _getHandler(methodName: string): Promise<(request: unknown, options?: BufRequestOptions) => unknown> {
    const handlers: BufRpcHandlers<S> = await getAsyncProviderValue(this._handlers);
    const handler = handlers[methodName as keyof typeof handlers];
    invariant(handler, `Handler is missing: ${methodName}`);
    return (handler as Function).bind(handlers);
  }
}

/**
 * Type-safe RPC peer for buf services.
 */
export class BufProtoRpcPeer<Client extends Record<string, GenService<GenServiceMethods>>> {
  constructor(
    public readonly rpc: { [K in keyof Client]: BufRpcClient<Client[K]> },
    private readonly _peer: RpcPeer,
  ) {}

  async open(): Promise<void> {
    await this._peer.open();
  }

  async close(): Promise<void> {
    await this._peer.close();
  }

  async abort(): Promise<void> {
    await this._peer.abort();
  }
}

export interface BufProtoRpcPeerOptions<
  Client extends Record<string, GenService<GenServiceMethods>>,
  Server extends Record<string, GenService<GenServiceMethods>>,
> extends Omit<RpcPeerOptions, 'callHandler' | 'streamHandler'> {
  /**
   * Services that are expected to be implemented by the counter-party.
   */
  requested?: BufServiceBundle<Client>;

  /**
   * Services exposed to the counter-party.
   */
  exposed?: BufServiceBundle<Server>;

  /**
   * Handlers for the exposed services.
   */
  handlers?: BufServiceHandlers<Server>;
}

/**
 * Parse a fully qualified method name into service and method name.
 */
const parseMethodName = (method: string): [serviceName: string, methodName: string] => {
  const separator = method.lastIndexOf('.');
  const serviceName = method.slice(0, separator);
  const methodName = method.slice(separator + 1);
  if (serviceName.length === 0 || methodName.length === 0) {
    throw new Error(`Invalid method: ${method}`);
  }
  return [serviceName, methodName];
};

/**
 * Create a type-safe RPC peer from a buf service bundle.
 * Can both handle and issue requests.
 */
export const createBufProtoRpcPeer = <
  Client extends Record<string, GenService<GenServiceMethods>> = {},
  Server extends Record<string, GenService<GenServiceMethods>> = {},
>({
  requested,
  exposed,
  handlers,
  ...rest
}: BufProtoRpcPeerOptions<Client, Server>): BufProtoRpcPeer<Client> => {
  // Create map of exposed service handlers.
  const exposedHandlers: Record<string, BufServiceHandler<GenService<GenServiceMethods>>> = {};
  if (exposed) {
    invariant(handlers, 'Handlers must be provided for exposed services.');
    for (const serviceName of Object.keys(exposed) as (keyof Server)[]) {
      const service = exposed[serviceName] as GenService<GenServiceMethods> & DescService;
      const serviceHandler = handlers[serviceName];
      const serviceFqn = service.typeName;
      exposedHandlers[serviceFqn] = new BufServiceHandler(
        service,
        serviceHandler as BufServiceProvider<BufRpcHandlers<GenService<GenServiceMethods>>>,
      );
    }
  }

  // Create peer.
  const peer = new RpcPeer({
    ...rest,

    callHandler: (method, request, options) => {
      const [serviceName, methodName] = parseMethodName(method);
      const handler = exposedHandlers[serviceName];
      if (!handler) {
        throw new Error(`Service not supported: ${serviceName}`);
      }
      return handler.call(methodName, request as BufAny, options);
    },

    streamHandler: (method, request, options) => {
      const [serviceName, methodName] = parseMethodName(method);
      const handler = exposedHandlers[serviceName];
      if (!handler) {
        throw new Error(`Service not supported: ${serviceName}`);
      }
      return handler.callStream(methodName, request as BufAny, options);
    },
  });

  // Create client proxies for requested services.
  const requestedClients = {} as { [K in keyof Client]: BufRpcClient<Client[K]> };
  if (requested) {
    for (const serviceName of Object.keys(requested) as (keyof Client)[]) {
      const service = requested[serviceName] as GenService<GenServiceMethods> & DescService;
      const serviceFqn = service.typeName;

      requestedClients[serviceName] = createBufClient(service, {
        call: (method, req, options) => peer.call(`${serviceFqn}.${method}`, req, options) as Promise<BufAny>,
        callStream: (method, req, options) =>
          peer.callStream(`${serviceFqn}.${method}`, req, options) as Stream<BufAny>,
      }) as BufRpcClient<Client[typeof serviceName]>;
    }
  }

  return new BufProtoRpcPeer(requestedClients, peer);
};

/**
 * Groups multiple buf services together to be served by a single RPC peer.
 */
export const createBufServiceBundle = <Services extends Record<string, GenService<GenServiceMethods>>>(
  services: BufServiceBundle<Services>,
): BufServiceBundle<Services> => services;
