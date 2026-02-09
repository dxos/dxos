//
// Copyright 2026 DXOS.org
//

import { type DescMessage, type MessageShape } from '@bufbuild/protobuf';
import { type GenService, type GenServiceMethods } from '@bufbuild/protobuf/codegenv2';

import type { Stream } from '@dxos/codec-protobuf/stream';

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
