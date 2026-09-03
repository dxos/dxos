//
// Copyright 2026 DXOS.org
//

import { type DescMethod, type DescService } from '@bufbuild/protobuf';

import { Stream } from '@dxos/async';
import {
  type Any,
  type EncodingOptions,
  type RequestOptions,
  type ServiceBackend,
  type ServiceProvider,
} from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { getAsyncProviderValue } from '@dxos/util';

import { bufRegistry } from './registry.ts';
import { type CompatCodec, compatCodec } from './shape-compat.ts';

// Buf's descriptors replace protobuf.js's `pb.Service` here. The shapes on either side of the codec
// are unchanged, so `ServiceBundle` consumers and RPC handlers see the same values as before; see
// `docs/audits/protobufjs-to-buf.md` (`#8`).

/**
 * Legacy `Any.type_url` carried protobuf.js's `fullName`, which is dot-prefixed; buf's `typeName` is
 * not. `service-type-url.test.ts` establishes that no peer reads it on the service path, so the
 * dot-free form goes on the wire unchanged rather than being re-prefixed to imitate the old value.
 */
const typeUrlFor = (desc: { readonly typeName: string }): string => desc.typeName;

type MethodCodecs = {
  readonly method: DescMethod;
  readonly request: CompatCodec<unknown>;
  readonly response: CompatCodec<unknown>;
};

/**
 * Buf equivalent of the legacy `ServiceDescriptor`, structurally compatible with it so a service
 * bundle can hold either.
 */
export class BufServiceDescriptor<Service> {
  #methods: Map<string, MethodCodecs> | undefined;

  constructor(private readonly _service: DescService) {}

  get name(): string {
    return this._service.typeName;
  }

  get serviceDesc(): DescService {
    return this._service;
  }

  createClient(backend: ServiceBackend, encodingOptions?: EncodingOptions): Service {
    const client: Record<string, unknown> = {};
    for (const method of this._service.methods) {
      // `localName` is the camelCase key protobuf.js derived by hand, so handler and client names
      // are unchanged by the switch.
      client[method.localName] = this.#methodStub(method, backend, encodingOptions);
      Object.defineProperty(client[method.localName], 'name', { value: method.localName });
    }

    return client as Service;
  }

  createServer(handlers: ServiceProvider<Service>, encodingOptions?: EncodingOptions): BufServiceHandler<Service> {
    return new BufServiceHandler(this._service, this.#methodCodecs(), handlers, encodingOptions);
  }

  #methodStub(method: DescMethod, backend: ServiceBackend, encodingOptions?: EncodingOptions) {
    const codecs = this.#methodCodecs().get(method.name);
    invariant(codecs, `Method not found: ${method.name}`);
    const request = (value: unknown): Any => ({
      value: codecs.request.encode(value, encodingOptions),
      type_url: typeUrlFor(method.input),
    });

    if (method.methodKind === 'server_streaming') {
      return (value: unknown, options?: RequestOptions) =>
        Stream.map(backend.callStream(method.name, request(value), options), (data) =>
          codecs.response.decode(data.value, encodingOptions),
        );
    }

    invariant(method.methodKind === 'unary', `Unsupported method kind: ${method.methodKind}`);
    return async (value: unknown, options?: RequestOptions) => {
      const response = await backend.call(method.name, request(value), options);
      return codecs.response.decode(response.value, encodingOptions);
    };
  }

  #methodCodecs(): Map<string, MethodCodecs> {
    return (this.#methods ??= new Map(
      this._service.methods.map((method) => [
        method.name,
        { method, request: compatCodec<unknown>(method.input), response: compatCodec<unknown>(method.output) },
      ]),
    ));
  }
}

/**
 * Buf equivalent of the legacy `ServiceHandler`.
 */
export class BufServiceHandler<Service> implements ServiceBackend {
  constructor(
    private readonly _service: DescService,
    private readonly _methods: Map<string, MethodCodecs>,
    private readonly _handlers: ServiceProvider<Service>,
    private readonly _encodingOptions?: EncodingOptions,
  ) {}

  async call(methodName: string, request: Any, options?: RequestOptions): Promise<Any> {
    const { method, request: requestCodec, response: responseCodec } = this.#methodInfo(methodName);
    invariant(method.methodKind === 'unary', `Invalid RPC method call: response streaming mismatch. ${methodName}`);

    const handler = await this.#handler(method);
    const response = await handler(requestCodec.decode(request.value, this._encodingOptions), options);

    return { value: responseCodec.encode(response, this._encodingOptions), type_url: typeUrlFor(method.output) };
  }

  callStream(methodName: string, request: Any, options?: RequestOptions): Stream<Any> {
    const { method, request: requestCodec, response: responseCodec } = this.#methodInfo(methodName);
    invariant(
      method.methodKind === 'server_streaming',
      `Invalid RPC method call: response streaming mismatch., ${methodName}`,
    );

    const decoded = requestCodec.decode(request.value, this._encodingOptions);
    const responses = Stream.unwrapPromise(
      this.#handler(method).then((handler) => handler(decoded, options) as Stream<unknown>),
    );

    return Stream.map(responses, (data): Any => ({
      value: responseCodec.encode(data, this._encodingOptions),
      type_url: typeUrlFor(method.output),
    }));
  }

  async #handler(method: DescMethod): Promise<(request: unknown, options?: RequestOptions) => unknown> {
    const service: Service = await getAsyncProviderValue(this._handlers);
    const handler = service[method.localName as keyof Service];
    invariant(handler, `Handler is missing: ${method.localName}`);
    return (handler as (...args: unknown[]) => unknown).bind(service);
  }

  #methodInfo(methodName: string): MethodCodecs {
    const codecs = this._methods.get(methodName);
    invariant(codecs, `Method not found: ${methodName} on ${this._service.typeName}`);
    return codecs;
  }
}

/**
 * Buf-backed counterpart to `schema.getService()`, keyed by the same fully-qualified service name.
 */
export const getBufService = <Service>(typeName: string): BufServiceDescriptor<Service> => {
  const desc = bufRegistry.getService(typeName);
  invariant(desc, `Service not found in the buf registry: ${typeName}`);
  return new BufServiceDescriptor<Service>(desc);
};
