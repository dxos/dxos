//
// Copyright 2021 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { invariant } from '@dxos/invariant';
import { type Rpc } from '@dxos/protocols';
import {
  type DescMethod,
  type DescService,
  type GenService,
  type GenServiceMethods,
  type Message,
  create,
  fromBinary,
  toBinary,
} from '@dxos/protocols/buf';
import { getAsyncProviderValue } from '@dxos/util';

import { RpcPeer, type RpcPeerOptions } from './rpc';

/**
 * Service backend interface for making RPC calls.
 */
export interface BufServiceBackend {
  call(method: string, request: Rpc.BufAny, requestOptions?: Rpc.BufRequestOptions): Promise<Rpc.BufAny>;
  callStream(method: string, request: Rpc.BufAny, requestOptions?: Rpc.BufRequestOptions): Stream<Rpc.BufAny>;
}

/**
 * Creates a client for a buf service.
 */
const createBufClient = <S extends GenService<GenServiceMethods>>(
  service: S & DescService,
  backend: BufServiceBackend,
): Rpc.BufRpcClient<S> => {
  const client: Record<string, unknown> = {};

  for (const [methodName, methodDef] of Object.entries(service.method)) {
    const descMethod = methodDef as DescMethod;
    const { methodKind, input, output } = descMethod;
    const rpcMethodName = descMethod.name;

    if (methodKind === 'server_streaming') {
      client[methodName] = (request: Message, options?: Rpc.BufRequestOptions): Stream<Message> => {
        const normalizedRequest = create(input, request as Record<string, unknown>);
        const encoded = toBinary(input, normalizedRequest);
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
      client[methodName] = async (request: Message, options?: Rpc.BufRequestOptions): Promise<Message> => {
        const normalizedRequest = create(input, request as Record<string, unknown>);
        const encoded = toBinary(input, normalizedRequest);
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

  return client as Rpc.BufRpcClient<S>;
};

/**
 * Handler implementation for a buf service.
 */
export class BufServiceHandler<S extends GenService<GenServiceMethods>> implements BufServiceBackend {
  constructor(
    private readonly _service: S & DescService,
    private readonly _handlers: Rpc.BufServiceProvider<Rpc.BufRpcHandlers<S>>,
  ) {}

  /**
   * Handle a unary RPC call.
   */
  async call(methodName: string, request: Rpc.BufAny, options?: Rpc.BufRequestOptions): Promise<Rpc.BufAny> {
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
    // Normalize the response to a proper buf message before serialization.
    const normalizedResponse = create(output, response as Record<string, unknown>);
    const responseEncoded = toBinary(output, normalizedResponse);

    return {
      value: responseEncoded,
      type_url: output.typeName,
    };
  }

  /**
   * Handle a streaming RPC call.
   */
  callStream(methodName: string, request: Rpc.BufAny, options?: Rpc.BufRequestOptions): Stream<Rpc.BufAny> {
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

    return Stream.map(responseStream, (data): Rpc.BufAny => {
      // Normalize the response to a proper buf message before serialization.
      const normalizedData = create(output, data as Record<string, unknown>);
      return {
        value: toBinary(output, normalizedData),
        type_url: output.typeName,
      };
    });
  }

  private async _getHandler(
    methodName: string,
  ): Promise<(request: unknown, options?: Rpc.BufRequestOptions) => unknown> {
    const handlers: Rpc.BufRpcHandlers<S> = await getAsyncProviderValue(this._handlers);
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
    public readonly rpc: { [K in keyof Client]: Rpc.BufRpcClient<Client[K]> },
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
  requested?: Rpc.BufServiceBundle<Client>;

  /**
   * Services exposed to the counter-party.
   */
  exposed?: Rpc.BufServiceBundle<Server>;

  /**
   * Handlers for the exposed services.
   */
  handlers?: Rpc.BufServiceHandlers<Server>;
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
        serviceHandler as Rpc.BufServiceProvider<Rpc.BufRpcHandlers<GenService<GenServiceMethods>>>,
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
      return handler.call(methodName, request as Rpc.BufAny, options);
    },

    streamHandler: (method, request, options) => {
      const [serviceName, methodName] = parseMethodName(method);
      const handler = exposedHandlers[serviceName];
      if (!handler) {
        throw new Error(`Service not supported: ${serviceName}`);
      }
      return handler.callStream(methodName, request as Rpc.BufAny, options);
    },
  });

  // Create client proxies for requested services.
  const requestedClients = {} as { [K in keyof Client]: Rpc.BufRpcClient<Client[K]> };
  if (requested) {
    for (const serviceName of Object.keys(requested) as (keyof Client)[]) {
      const service = requested[serviceName] as GenService<GenServiceMethods> & DescService;
      const serviceFqn = service.typeName;

      requestedClients[serviceName] = createBufClient(service, {
        call: (method, req, options) => peer.call(`${serviceFqn}.${method}`, req, options) as Promise<Rpc.BufAny>,
        callStream: (method, req, options) =>
          peer.callStream(`${serviceFqn}.${method}`, req, options) as Stream<Rpc.BufAny>,
      }) as Rpc.BufRpcClient<Client[typeof serviceName]>;
    }
  }

  return new BufProtoRpcPeer(requestedClients, peer);
};

/**
 * Groups multiple buf services together to be served by a single RPC peer.
 */
export const createBufServiceBundle = <Services extends Record<string, GenService<GenServiceMethods>>>(
  services: Rpc.BufServiceBundle<Services>,
): Rpc.BufServiceBundle<Services> => services;
