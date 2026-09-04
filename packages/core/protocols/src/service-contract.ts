//
// Copyright 2026 DXOS.org
//

import { type Stream } from '@dxos/async';
import { type Context } from '@dxos/context';

import { type CompatOptions } from './buf/shape-compat.ts';

/**
 * The RPC service contract, shared by the buf-backed descriptor in `./buf/service.ts` and the
 * protobuf.js one that dies with `@dxos/codec-protobuf`.
 *
 * It lives here rather than in `@dxos/codec-protobuf` because none of it is about protobuf.js:
 * `@dxos/rpc` and `@dxos/client-protocol` both depend on this package already, so the contract sits
 * below every consumer without a package of its own.
 */

/** Options a caller passes per request; nothing here reaches the wire. */
export type RequestOptions = {
  timeout?: number;
  ctx?: Context;
};

/**
 * The still-packed request/response envelope a backend moves.
 *
 * `type_url` is snake_case because that is the shape the compat layer produces; it becomes buf's
 * `typeUrl` when the shape-compat layer retires, not before.
 */
export type AnyEnvelope = {
  type_url: string;
  value: Uint8Array;
};

/** A message tagged with its own type name, as an `Any` field decodes to. */
export type TaggedType<TYPES extends {}, Name extends keyof TYPES> = TYPES[Name] & { '@type': Name };

export interface ServiceBackend {
  call(method: string, request: AnyEnvelope, requestOptions?: RequestOptions): Promise<AnyEnvelope>;
  callStream(method: string, request: AnyEnvelope, requestOptions?: RequestOptions): Stream<AnyEnvelope>;
}

export type ServiceProvider<Service> = Service | (() => Service) | (() => Promise<Service>);

/**
 * What a service bundle needs of a descriptor, so a bundle can hold either implementation.
 *
 * The options are the compat layer's, not protobuf.js's: they exist only while a codec still has to
 * reproduce protobuf.js's substituted shapes, and go when it does.
 */
export interface ServiceDescriptorLike<Service> {
  readonly name: string;
  createClient(backend: ServiceBackend, encodingOptions?: CompatOptions): Service;
  /**
   * `NoInfer` keeps `createClient` the single source of `Service`: a descriptor built against
   * `@dxos/codec-protobuf`'s own structurally-identical `ServiceProvider` would otherwise make a
   * bundle infer the provider union here instead of the service.
   */
  createServer(handlers: ServiceProvider<NoInfer<Service>>, encodingOptions?: CompatOptions): ServiceBackend;
}
