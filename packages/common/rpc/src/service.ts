//
// Copyright 2021 DXOS.org
//

import { ServiceDescriptor, ServiceHandler } from '@dxos/codec-protobuf';

import { RpcPeer, RpcPeerOptions } from './rpc';

export type ServiceBundle<S> = { [K in keyof S]: ServiceDescriptor<S[K]> }

/**
 * Groups multiple services together so they can be served over one RPC peer.
 */
export const createServiceBundle = <S>(services: ServiceBundle<S>): ServiceBundle<S> => services;

/**
 * A type-safe RPC peer.
 */
export class ProtoRpcPeer<S> {
  constructor (
    public readonly rpc: S,
    private readonly peer: RpcPeer
  ) {}

  async open () {
    await this.peer.open();
  }

  close () {
    this.peer.close();
  }
}

export interface ProtoRpcPeerOptions<Client, Server> extends Omit<RpcPeerOptions, 'messageHandler' | 'streamHandler'> {
  /**
   * Services that are expected to be serviced by the counter-party.
   */
  requested: ServiceBundle<Client>

  /**
   * Services exposed to the counter-party.
   */
  exposed: ServiceBundle<Server>

  /**
   * Handlers for the exposed services
   * */
  handlers: Server
}

/**
 * Create type-safe RPC peer from a service bundle. Can both handle and issue requests.
 */
export const createProtoRpcPeer = <Client = {}, Server = {}>({ requested, exposed, handlers, ...rest }: ProtoRpcPeerOptions<Client, Server>): ProtoRpcPeer<Client> => {
  const exposedRpcs: Record<string, ServiceHandler<any>> = {};
  for (const serviceName of Object.keys(exposed) as (keyof Server)[]) {
    // Get full service name with the package name without '.' at the beginning.
    const serviceFqn = exposed[serviceName].serviceProto.fullName.slice(1);

    exposedRpcs[serviceFqn] = exposed[serviceName].createServer(handlers[serviceName] as any);
  }

  const peer = new RpcPeer({
    ...rest,
    messageHandler: (method, request) => {
      const [serviceName, methodName] = parseMethodName(method);

      if (!exposedRpcs[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }
      return exposedRpcs[serviceName].call(methodName, request);
    },
    streamHandler: (method, request) => {
      const [serviceName, methodName] = parseMethodName(method);

      if (!exposedRpcs[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }
      return exposedRpcs[serviceName].callStream(methodName, request);
    }
  });

  const requestedRpcs: Client = {} as Client;
  for (const serviceName of Object.keys(requested) as (keyof Client)[]) {
    // Get full service name with the package name without '.' at the beginning.
    const serviceFqn = requested[serviceName].serviceProto.fullName.slice(1);

    requestedRpcs[serviceName] = requested[serviceName].createClient({
      call: (method, req) => peer.call(`${serviceFqn}.${method}`, req),
      callStream: (method, req) => peer.callStream(`${serviceFqn}.${method}`, req)
    });
  }

  return new ProtoRpcPeer(requestedRpcs, peer);
};

/**
 * Create a type-safe RPC client.
 * @deprecated Use createProtoRpcPeer instead.
 */
export const createRpcClient = <S>(serviceDef: ServiceDescriptor<S>, options: Omit<RpcPeerOptions, 'messageHandler'>): ProtoRpcPeer<S> => {
  const peer = new RpcPeer({
    ...options,
    messageHandler: () => {
      throw new Error('Requests to client are not supported.');
    }
  });

  const client = serviceDef.createClient({
    call: peer.call.bind(peer),
    callStream: peer.callStream.bind(peer)
  });

  return new ProtoRpcPeer(client, peer);
};

/**
 * @deprecated
 */
export interface RpcServerOptions<S> extends Omit<RpcPeerOptions, 'messageHandler'> {
  service: ServiceDescriptor<S>
  handlers: S
}

/**
 * Create a type-safe RPC server.
 * @deprecated Use createProtoRpcPeer instead.
 */
export const createRpcServer = <S>({ service, handlers, ...rest }: RpcServerOptions<S>): RpcPeer => {
  const server = service.createServer(handlers);

  const peer = new RpcPeer({
    ...rest,
    messageHandler: server.call.bind(server),
    streamHandler: server.callStream.bind(server)
  });

  return peer;
};

/**
 * Create type-safe RPC client from a service bundle.
 * @deprecated Use createProtoRpcPeer instead.
 */
export const createBundledRpcClient = <S>(descriptors: ServiceBundle<S>, options: Omit<RpcPeerOptions, 'messageHandler' | 'streamHandler'>): ProtoRpcPeer<S> => {
  return createProtoRpcPeer({
    requested: descriptors,
    exposed: {},
    handlers: {},
    ...options
  });
};

/**
 * @deprecated
 */
export interface RpcBundledServerOptions<S> extends Omit<RpcPeerOptions, 'messageHandler'> {
  services: ServiceBundle<S>
  handlers: S
}

/**
 * Create type-safe RPC server from a service bundle.
 * @deprecated Use createProtoRpcPeer instead.
 */
export const createBundledRpcServer = <S>({ services, handlers, ...rest }: RpcBundledServerOptions<S>): RpcPeer => {
  const rpc: Record<string, ServiceHandler<any>> = {};
  for (const serviceName of Object.keys(services) as (keyof S)[]) {
    // Get full service name with the package name without '.' at the beginning.
    const serviceFqn = services[serviceName].serviceProto.fullName.slice(1);

    rpc[serviceFqn] = services[serviceName].createServer(handlers[serviceName] as any);
  }

  const peer = new RpcPeer({
    ...rest,
    messageHandler: (method, request) => {
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
    }
  });

  return peer;
};

const parseMethodName = (method: string): [serviceName: string, methodName: string] => {
  const separator = method.lastIndexOf('.');
  const serviceName = method.slice(0, separator);
  const methodName = method.slice(separator + 1);
  if (serviceName.length === 0 || methodName.length === 0) {
    throw new Error(`Invalid method: ${method}`);
  }
  return [serviceName, methodName];
};
