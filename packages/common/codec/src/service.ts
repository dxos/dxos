//
// Copyright 2021 DXOS.org
//

import { type Stream } from '@dxos/async';
import { type Context } from '@dxos/context';

import { type Any, type EncodingOptions } from './codec';

export type RequestOptions = {
  timeout?: number;
  ctx?: Context;
};

/**
 * Service endpoint.
 */
export interface ServiceBackend {
  call(method: string, request: Any, requestOptions?: RequestOptions): Promise<Any>;
  callStream(method: string, request: Any, requestOptions?: RequestOptions): Stream<Any>;
}

export type ServiceProvider<Service> = Service | (() => Service) | (() => Promise<Service>);

/**
 * What a service bundle needs of a descriptor, so a bundle can hold either the protobuf.js
 * implementation in `@dxos/codec-protobuf` or the buf-backed one in `@dxos/protocols/buf-service`.
 */
export interface ServiceDescriptorLike<Service> {
  readonly name: string;
  createClient(backend: ServiceBackend, encodingOptions?: EncodingOptions): Service;
  createServer(handlers: ServiceProvider<Service>, encodingOptions?: EncodingOptions): ServiceBackend;
}
