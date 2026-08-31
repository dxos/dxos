//
// Copyright 2021 DXOS.org
//

import type pb from 'protobufjs';

import { Stream } from '@dxos/async';
import type { RequestOptions } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { getAsyncProviderValue } from '@dxos/util';

import { type Any, type EncodingOptions } from './common';
import type { Schema } from './schema';

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
 * implementation below or the buf-backed one in `@dxos/protocols/buf-service`.
 */
export interface ServiceDescriptorLike<Service> {
  readonly name: string;
  createClient(backend: ServiceBackend, encodingOptions?: EncodingOptions): Service;
  createServer(handlers: ServiceProvider<Service>, encodingOptions?: EncodingOptions): ServiceBackend;
}

/**
 * Client/server service wrapper.
 */
export class ServiceDescriptor<S> implements ServiceDescriptorLike<S> {
  // prettier-ignore
  constructor(
    private readonly _service: pb.Service,
    private readonly _schema: Schema,
  ) {}

  get serviceProto(): pb.Service {
    return this._service;
  }

  get name(): string {
    return this._service.fullName.slice(1);
  }

  createClient(backend: ServiceBackend, encodingOptions?: EncodingOptions): Service & S {
    return new Service(backend, this._service, this._schema, encodingOptions) as Service & S;
  }

  createServer(handlers: ServiceProvider<S>, encodingOptions?: EncodingOptions): ServiceHandler<S> {
    return new ServiceHandler(this._service, this._schema, handlers, encodingOptions);
  }
}

/**
 * Represents service instance.
 */
export class Service {
  // Dynamically-named RPC methods are attached below, one per `service.methodsArray` entry.
  [methodName: string]: unknown;

  constructor(backend: ServiceBackend, service: pb.Service, schema: Schema, encodingOptions?: EncodingOptions) {
    for (const method of service.methodsArray) {
      method.resolve();
      invariant(method.resolvedRequestType);
      invariant(method.resolvedResponseType);
      invariant(!method.requestStream, 'Streaming RPC requests are not supported.');
      // Captured as locals so the closures below keep the narrowing — re-reading
      // `method.resolvedRequestType` inside a closure loses it.
      const requestType = method.resolvedRequestType;
      const responseType = method.resolvedResponseType;

      // TODO(dmaretskyi): What about primitive types.
      const requestCodec = schema.tryGetCodecForType(requestType.fullName);
      const responseCodec = schema.tryGetCodecForType(responseType.fullName);
      const methodName = mapRpcMethodName(method.name);

      if (method.responseStream) {
        this[methodName] = (request: unknown, requestOptions?: RequestOptions) => {
          const encoded = requestCodec.encode(request, encodingOptions);
          const stream = backend.callStream(
            method.name,
            {
              value: encoded,
              type_url: requestType.fullName,
            },
            requestOptions,
          );
          return Stream.map(stream, (data) => responseCodec.decode(data.value!, encodingOptions));
        };
      } else {
        this[methodName] = async (request: unknown, requestOptions?: RequestOptions) => {
          const encoded = requestCodec.encode(request, encodingOptions);
          const response = await backend.call(
            method.name,
            {
              value: encoded,
              type_url: requestType.fullName,
            },
            requestOptions,
          );
          return responseCodec.decode(response.value, encodingOptions);
        };
      }

      // Set function name so that is properly named in stack traces.
      Object.defineProperty(this[methodName], 'name', {
        value: methodName,
      });
    }
  }
}

/**
 * Represents service endpoint implementation.
 */
export class ServiceHandler<S = {}> implements ServiceBackend {
  constructor(
    private readonly _serviceDefinition: pb.Service,
    private readonly _schema: Schema,
    private readonly _serviceProvider: ServiceProvider<S>,
    private readonly _encodingOptions?: EncodingOptions,
  ) {}

  /**
   * Request/response method call.
   */
  async call(methodName: string, request: Any, options?: RequestOptions): Promise<Any> {
    const { method, responseType, requestCodec, responseCodec } = this._getMethodInfo(methodName);
    invariant(!method.requestStream, 'Invalid RPC method call: request streaming mismatch.');
    invariant(!method.responseStream, `Invalid RPC method call: response streaming mismatch. ${methodName}`);

    const mappedMethodName = mapRpcMethodName(methodName);

    const handler = await this._getHandler(mappedMethodName);
    const requestDecoded = requestCodec.decode(request.value, this._encodingOptions);
    const response = await handler(requestDecoded, options);
    const responseEncoded = responseCodec.encode(response, this._encodingOptions);

    return {
      value: responseEncoded,
      type_url: responseType.fullName,
    };
  }

  /**
   * Streaming method call.
   */
  callStream(methodName: string, request: Any, options?: RequestOptions): Stream<Any> {
    const { method, responseType, requestCodec, responseCodec } = this._getMethodInfo(methodName);
    invariant(!method.requestStream, 'Invalid RPC method call: request streaming mismatch.');
    invariant(method.responseStream, `Invalid RPC method call: response streaming mismatch., ${methodName}`);

    const mappedMethodName = mapRpcMethodName(methodName);
    const handlerPromise = this._getHandler(mappedMethodName);

    const requestDecoded = requestCodec.decode(request.value, this._encodingOptions);
    const responseStream = Stream.unwrapPromise(
      handlerPromise.then((handler) => handler(requestDecoded, options) as Stream<unknown>),
    );
    return Stream.map(responseStream, (data): Any => ({
      value: responseCodec.encode(data, this._encodingOptions),
      type_url: responseType.fullName,
    }));
  }

  private async _getHandler(method: string): Promise<(request: unknown, options?: RequestOptions) => unknown> {
    const service: S = await getAsyncProviderValue(this._serviceProvider);
    const handler = service[method as keyof S] as ((...args: unknown[]) => unknown) | undefined;
    invariant(handler, `Handler is missing: ${method}`);
    return handler.bind(service);
  }

  private _getMethodInfo(methodName: string) {
    const method = this._serviceDefinition.methods[methodName];
    invariant(!!method, `Method not found: ${methodName}`);

    method.resolve();
    invariant(method.resolvedRequestType);
    invariant(method.resolvedResponseType);
    // Returned as locals so callers keep the narrowing instead of re-asserting non-null.
    const requestType = method.resolvedRequestType;
    const responseType = method.resolvedResponseType;

    const requestCodec = this._schema.tryGetCodecForType(requestType.fullName);
    const responseCodec = this._schema.tryGetCodecForType(responseType.fullName);

    return { method, requestType, responseType, requestCodec, responseCodec };
  }
}

const mapRpcMethodName = (name: string) => name[0].toLocaleLowerCase() + name.substring(1);
