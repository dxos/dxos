//
// Copyright 2021 DXOS.org
//

import {
  type EncodingOptions,
  type ServiceDescriptor,
  type ServiceHandler,
  type ServiceProvider,
} from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';

import { RpcPeer, type RpcPeerOptions } from './rpc';

/**
 * Map of service definitions.
 */
// TODO(burdon): Rename ServiceMap.
export type ServiceBundle<Services> = { [Key in keyof Services]: ServiceDescriptor<Services[Key]> };

export type ServiceHandlers<Services> = { [ServiceName in keyof Services]: ServiceProvider<Services[ServiceName]> };

export type ServiceTypesOf<Bundle extends ServiceBundle<any>> =
  Bundle extends ServiceBundle<infer Services> ? Services : never;

/**
 * Groups multiple services together to be served by a single RPC peer.
 */
export const createServiceBundle = <Service>(services: ServiceBundle<Service>): ServiceBundle<Service> => services;

/**
 * Type-safe RPC peer.
 */
export class ProtoRpcPeer<Service> {
  constructor(
    public readonly rpc: Service,
    private readonly _peer: RpcPeer,
  ) {}

  async open() {
    await this._peer.open();
  }

  async close() {
    await this._peer.close();
  }

  async abort() {
    await this._peer.abort();
  }
}

export interface ProtoRpcPeerOptions<Client, Server> extends Omit<RpcPeerOptions, 'callHandler' | 'streamHandler'> {
  /**
   * Services that are expected to be implemented by the counter-space.
   */
  // TODO(burdon): Rename proxy.
  requested?: ServiceBundle<Client>;

  /**
   * Services exposed to the counter-space.
   */
  // TODO(burdon): Rename service.
  exposed?: ServiceBundle<Server>;

  /**
   * Handlers for the exposed services
   */
  handlers?: ServiceHandlers<Server>;

  /**
   * Encoding options passed to the underlying proto codec.
   */
  encodingOptions?: EncodingOptions;
}

/**
 * Create type-safe RPC peer from a service bundle.
 * Can both handle and issue requests.
 */
// TODO(burdon): Currently assumes that the proto service name is unique.
//  Support multiple instances services definitions (e.g., halo/space invitations).
export const createProtoRpcPeer = <Client = {}, Server = {}>({
  requested,
  exposed,
  handlers,
  encodingOptions,
  ...rest
}: ProtoRpcPeerOptions<Client, Server>): ProtoRpcPeer<Client> => {
  // Create map of RPCs.
  const exposedRpcs: Record<string, ServiceHandler<any>> = {};
  if (exposed) {
    invariant(handlers);
    for (const serviceName of Object.keys(exposed) as (keyof Server)[]) {
      // Get full service name with the package name without '.' at the beginning.
      const serviceFqn = exposed[serviceName].serviceProto.fullName.slice(1);
      const serviceProvider = handlers[serviceName];
      exposedRpcs[serviceFqn] = exposed[serviceName].createServer(serviceProvider, encodingOptions);
    }
  }

  // Create peer.
  const peer = new RpcPeer({
    ...rest,

    callHandler: (method, request, options) => {
      const [serviceName, methodName] = parseMethodName(method);
      if (!exposedRpcs[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }

      return exposedRpcs[serviceName].call(methodName, request, options);
    },

    streamHandler: (method, request, options) => {
      const [serviceName, methodName] = parseMethodName(method);
      if (!exposedRpcs[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }

      return exposedRpcs[serviceName].callStream(methodName, request, options);
    },
  });

  const requestedRpcs: Client = {} as Client;
  if (requested) {
    for (const serviceName of Object.keys(requested) as (keyof Client)[]) {
      // Get full service name with the package name without '.' at the beginning.
      const serviceFqn = requested[serviceName].serviceProto.fullName.slice(1);

      requestedRpcs[serviceName] = requested[serviceName].createClient(
        {
          call: (method, req, options) => peer.call(`${serviceFqn}.${method}`, req, options),
          callStream: (method, req, options) => peer.callStream(`${serviceFqn}.${method}`, req, options),
        },
        encodingOptions,
      );
    }
  }

  return new ProtoRpcPeer(requestedRpcs, peer);
};

export const parseMethodName = (method: string): [serviceName: string, methodName: string] => {
  const separator = method.lastIndexOf('.');
  const serviceName = method.slice(0, separator);
  const methodName = method.slice(separator + 1);
  if (serviceName.length === 0 || methodName.length === 0) {
    throw new Error(`Invalid method: ${method}`);
  }

  return [serviceName, methodName];
};

//
// TODO(burdon): Remove deprecated (only bot factory).
//

/**
 * Create a type-safe RPC client.
 * @deprecated Use createProtoRpcPeer instead.
 */
export const createRpcClient = <S>(
  serviceDef: ServiceDescriptor<S>,
  options: Omit<RpcPeerOptions, 'callHandler'>,
): ProtoRpcPeer<S> => {
  const peer = new RpcPeer({
    ...options,
    callHandler: () => {
      throw new Error('Requests to client are not supported.');
    },
  });

  const client = serviceDef.createClient({
    call: peer.call.bind(peer),
    callStream: peer.callStream.bind(peer),
  });

  return new ProtoRpcPeer(client, peer);
};

/**
 * @deprecated
 */
export interface RpcServerOptions<S> extends Omit<RpcPeerOptions, 'callHandler'> {
  service: ServiceDescriptor<S>;
  handlers: S;
}

/**
 * Create a type-safe RPC server.
 * @deprecated Use createProtoRpcPeer instead.
 */
export const createRpcServer = <S>({ service, handlers, ...rest }: RpcServerOptions<S>): RpcPeer => {
  const server = service.createServer(handlers);
  return new RpcPeer({
    ...rest,
    callHandler: server.call.bind(server),
    streamHandler: server.callStream.bind(server),
  });
};

/**
 * Create type-safe RPC client from a service bundle.
 * @deprecated Use createProtoRpcPeer instead.
 */
export const createBundledRpcClient = <S>(
  descriptors: ServiceBundle<S>,
  options: Omit<RpcPeerOptions, 'callHandler' | 'streamHandler'>,
): ProtoRpcPeer<S> => {
  return createProtoRpcPeer({
    requested: descriptors,
    ...options,
  });
};

/**
 * @deprecated
 */
export interface RpcBundledServerOptions<S> extends Omit<RpcPeerOptions, 'callHandler'> {
  services: ServiceBundle<S>;
  handlers: S;
}

/**
 * Create type-safe RPC server from a service bundle.
 * @deprecated Use createProtoRpcPeer instead.
 */
// TODO(burdon): Support late-binding via providers.
export const createBundledRpcServer = <S>({ services, handlers, ...rest }: RpcBundledServerOptions<S>): RpcPeer => {
  const rpc: Record<string, ServiceHandler<any>> = {};
  for (const serviceName of Object.keys(services) as (keyof S)[]) {
    // Get full service name with the package name without '.' at the beginning.
    const serviceFqn = services[serviceName].serviceProto.fullName.slice(1);
    rpc[serviceFqn] = services[serviceName].createServer(handlers[serviceName] as any);
  }

  return new RpcPeer({
    ...rest,

    callHandler: (method, request) => {
      const [serviceName, methodName] = parseMethodName(method);
      if (!rpc[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }

      return rpc[serviceName].call(methodName, request);
    },

    streamHandler: (method, request) => {
      const [serviceName, methodName] = parseMethodName(method);
      if (!rpc[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }

      return rpc[serviceName].callStream(methodName, request);
    },
  });
};
