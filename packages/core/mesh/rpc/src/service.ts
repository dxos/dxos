//
// Copyright 2021 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { AnySchema, type Any as BufAny } from '@bufbuild/protobuf/wkt';

import {
  type Any as CodecProtobufAny,
  type EncodingOptions,
  type ServiceDescriptor,
  type ServiceHandler,
  type ServiceProvider,
} from '@dxos/codec-protobuf';
import { Stream } from '@dxos/codec-protobuf/stream';
import { invariant } from '@dxos/invariant';

import { RpcPeer, type RpcPeerOptions } from './rpc';

/** Convert codec-protobuf wire `Any` (`type_url`) to bufbuild `google.protobuf.Any`. */
export const codecProtobufAnyToBufAny = (value: CodecProtobufAny): BufAny =>
  create(AnySchema, { typeUrl: value.type_url, value: value.value });

/** Convert bufbuild `google.protobuf.Any` to codec-protobuf wire `Any` (`type_url`). */
export const bufAnyToCodecProtobufAny = (value: BufAny): CodecProtobufAny => ({
  type_url: value.typeUrl,
  value: value.value,
});

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

      return exposedRpcs[serviceName]
        .call(methodName, bufAnyToCodecProtobufAny(request), options)
        .then(codecProtobufAnyToBufAny);
    },

    streamHandler: (method, request, options) => {
      const [serviceName, methodName] = parseMethodName(method);
      if (!exposedRpcs[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }

      return Stream.map(
        exposedRpcs[serviceName].callStream(methodName, bufAnyToCodecProtobufAny(request), options),
        codecProtobufAnyToBufAny,
      );
    },
  });

  const requestedRpcs: Client = {} as Client;
  if (requested) {
    for (const serviceName of Object.keys(requested) as (keyof Client)[]) {
      // Get full service name with the package name without '.' at the beginning.
      const serviceFqn = requested[serviceName].serviceProto.fullName.slice(1);

      requestedRpcs[serviceName] = requested[serviceName].createClient(
        {
          call: async (method, req, options) =>
            bufAnyToCodecProtobufAny(
              await peer.call(`${serviceFqn}.${method}`, codecProtobufAnyToBufAny(req), options),
            ),
          callStream: (method, req, options) =>
            Stream.map(
              peer.callStream(`${serviceFqn}.${method}`, codecProtobufAnyToBufAny(req), options),
              bufAnyToCodecProtobufAny,
            ),
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
    call: async (method, req, options) =>
      bufAnyToCodecProtobufAny(await peer.call(method, codecProtobufAnyToBufAny(req), options)),
    callStream: (method, req, options) =>
      Stream.map(peer.callStream(method, codecProtobufAnyToBufAny(req), options), bufAnyToCodecProtobufAny),
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
    callHandler: async (method, request, options) =>
      codecProtobufAnyToBufAny(await server.call(method, bufAnyToCodecProtobufAny(request), options)),
    streamHandler: (method, request, options) =>
      Stream.map(server.callStream(method, bufAnyToCodecProtobufAny(request), options), codecProtobufAnyToBufAny),
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

    callHandler: async (method, request, options) => {
      const [serviceName, methodName] = parseMethodName(method);
      if (!rpc[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }

      return codecProtobufAnyToBufAny(
        await rpc[serviceName].call(methodName, bufAnyToCodecProtobufAny(request), options),
      );
    },

    streamHandler: (method, request, options) => {
      const [serviceName, methodName] = parseMethodName(method);
      if (!rpc[serviceName]) {
        throw new Error(`Service not supported: ${serviceName}`);
      }

      return Stream.map(
        rpc[serviceName].callStream(methodName, bufAnyToCodecProtobufAny(request), options),
        codecProtobufAnyToBufAny,
      );
    },
  });
};
