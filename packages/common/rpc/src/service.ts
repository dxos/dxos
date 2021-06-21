//
// Copyright 2021 DXOS.org
//

import { Service, ServiceDescriptor } from '@dxos/codec-protobuf';

import { RpcPeer, RpcPeerOptions } from './rpc';

/**
 * A type-safe RPC client.
 */
export class ProtoRpcClient<S> {
  constructor (
    public readonly rpc: Service & S,
    private readonly peer: RpcPeer
  ) {}

  async open () {
    await this.peer.open();
  }

  close () {
    this.peer.close();
  }

  async receive (msg: Uint8Array): Promise<void> {
    await this.peer.receive(msg);
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
    call: peer.call.bind(peer)
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
    messageHandler: server.call.bind(server)
  });

  return peer;
}
