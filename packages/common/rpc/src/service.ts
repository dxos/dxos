//
// Copyright 2021 DXOS.org
//

import { ServiceDescriptor, ServiceHandler } from '@dxos/codec-protobuf';

import { RpcPeer, RpcPeerOptions } from './rpc';

/**
 * A type-safe RPC client.
 */
export class ProtoRpcClient<S> {
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

/**
 * Create a type-safe RPC client.
 */
export function createRpcClient<S> (serviceDef: ServiceDescriptor<S>, options: Omit<RpcPeerOptions, 'messageHandler'>): ProtoRpcClient<S> {
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

  return new ProtoRpcClient(client, peer);
}

export interface ProtoRpcServerOptions<S> extends Omit<RpcPeerOptions, 'messageHandler'> {
  service: ServiceDescriptor<S>,
  handlers: S,
}

/**
 * Create a type-safe RPC server.
 */
export function createRpcServer<S> ({ service, handlers, ...rest }: ProtoRpcServerOptions<S>): RpcPeer {
  const server = service.createServer(handlers);

  const peer = new RpcPeer({
    ...rest,
    messageHandler: server.call.bind(server),
    streamHandler: server.callStream.bind(server)
  });

  return peer;
}

export type ServiceBundle<S extends Record<string, {}>> = { [K in keyof S]: ServiceDescriptor<S[K]> }

/**
 * Groups multiple services together so they can be served over one RPC peer.
 */
export function createServiceBundle<S extends Record<string, {}>> (services: ServiceBundle<S>): ServiceBundle<S> {
  return services;
}

/**
 * Create type-safe RPC client from a service bundle.
 */
export function createBundledRpcClient<S extends Record<string, {}>> (descriptors: ServiceBundle<S>, options: Omit<RpcPeerOptions, 'messageHandler'>): ProtoRpcClient<S> {
  const peer = new RpcPeer({
    ...options,
    messageHandler: () => {
      throw new Error('Requests to client are not supported.');
    }
  });

  const rpc: S = {} as S;
  for (const serviceName of Object.keys(descriptors) as (keyof S)[]) {
    rpc[serviceName] = descriptors[serviceName].createClient({
      call: (method, req) => peer.call(`${serviceName}.${method}`, req),
      callStream: (method, req) => peer.callStream(`${serviceName}.${method}`, req)
    });
  }

  return new ProtoRpcClient(rpc, peer);
}

export interface ProtoRpcBundledServerOptions<S extends Record<string, {}>> extends Omit<RpcPeerOptions, 'messageHandler'> {
  services: ServiceBundle<S>,
  handlers: S,
}

/**
 * Create type-safe RPC server from a service bundle.
 */
export function createBundledRpcServer<S extends Record<string, {}>> ({ services, handlers, ...rest }: ProtoRpcBundledServerOptions<S>): RpcPeer {
  const rpc: Record<string, ServiceHandler<any>> = {};
  for (const serviceName of Object.keys(services)) {
    rpc[serviceName] = services[serviceName].createServer(handlers[serviceName] as any);
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
}

const parseMethodName = (method: string): [serviceName: string, methodName: string] => {
  const [serviceName, ...rest] = method.split('.');
  if (rest.length === 0) {
    throw new Error('Method name required');
  }
  return [serviceName, rest.join('.')];
};
