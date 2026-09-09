//
// Copyright 2026 DXOS.org
//

import {
  type DescMessage,
  type DescMethod,
  type DescService,
  type Message,
  create,
  fromBinary,
  toBinary,
} from '@bufbuild/protobuf';
import { type GenMessage, type GenService } from '@bufbuild/protobuf/codegenv2';
import { AnySchema } from '@bufbuild/protobuf/wkt';

import { Stream } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { getAsyncProviderValue } from '@dxos/util';

import {
  type AnyEnvelope,
  type RequestOptions,
  type ServiceBackend,
  type ServiceProvider,
} from '../service-contract.ts';
import { bufRegistry } from './registry';

// Buf's descriptors replace protobuf.js's `pb.Service` here. The shapes on either side of the codec
// are unchanged, so `ServiceBundle` consumers and RPC handlers see the same values as before; see
// `docs/audits/protobufjs-to-buf.md` (`#8`).

/**
 * Legacy `Any.typeUrl` carried protobuf.js's `fullName`, which is dot-prefixed; buf's `typeName` is
 * not. `service-type-url.test.ts` establishes that no peer reads it on the service path, so the
 * dot-free form goes on the wire unchanged rather than being re-prefixed to imitate the old value.
 */
const typeUrlFor = (desc: { readonly typeName: string }): string => desc.typeName;

/** The message a generated schema describes. */
type MessageOf<Schema> = Schema extends GenMessage<infer M> ? M : never;

/**
 * The handler interface a generated service describes: one method per RPC, buf messages either side.
 *
 * `protoc-gen-es` emits a service as a descriptor value rather than an interface, where protobuf.js
 * generated one; deriving it from the descriptor keeps a service's shape in the `.proto` instead of
 * restating it in TypeScript.
 */
export type BufService<Service> =
  Service extends GenService<infer Methods>
    ? {
        [Name in keyof Methods]: Methods[Name] extends { methodKind: 'unary'; input: infer I; output: infer O }
          ? (request: MessageOf<I>, options?: RequestOptions) => Promise<MessageOf<O>>
          : Methods[Name] extends { methodKind: 'server_streaming'; input: infer I; output: infer O }
            ? (request: MessageOf<I>, options?: RequestOptions) => Stream<MessageOf<O>>
            : never;
      }
    : never;

type MethodCodecs = {
  readonly method: DescMethod;
  readonly request: DescMessage;
  readonly response: DescMessage;
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

  /** Builds a client whose methods encode onto `backend` and decode its responses. */
  createClient(backend: ServiceBackend): Service {
    const client: Record<string, unknown> = {};
    for (const method of this._service.methods) {
      // `localName` is the camelCase key protobuf.js derived by hand, so handler and client names
      // are unchanged by the switch.
      client[method.localName] = this.#methodStub(method, backend);
      Object.defineProperty(client[method.localName], 'name', { value: method.localName });
    }

    return client as Service;
  }

  /** Builds a backend that decodes onto `handlers` and encodes what they return. */
  createServer(handlers: ServiceProvider<Service>): BufServiceHandler<Service> {
    return new BufServiceHandler(this._service, this.#methodCodecs(), handlers);
  }

  #methodStub(method: DescMethod, backend: ServiceBackend) {
    const codecs = this.#methodCodecs().get(method.name);
    invariant(codecs, `Method not found: ${method.name}`);
    const request = (value: unknown): AnyEnvelope =>
      create(AnySchema, { value: toBinary(codecs.request, value as Message), typeUrl: typeUrlFor(method.input) });

    if (method.methodKind === 'server_streaming') {
      return (value: unknown, options?: RequestOptions) =>
        Stream.map(backend.callStream(method.name, request(value), options), (data) =>
          fromBinary(codecs.response, data.value),
        );
    }

    invariant(method.methodKind === 'unary', `Unsupported method kind: ${method.methodKind}`);
    return async (value: unknown, options?: RequestOptions) => {
      const response = await backend.call(method.name, request(value), options);
      return fromBinary(codecs.response, response.value);
    };
  }

  #methodCodecs(): Map<string, MethodCodecs> {
    return (this.#methods ??= new Map(
      this._service.methods.map((method) => [method.name, { method, request: method.input, response: method.output }]),
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
  ) {}

  async call(methodName: string, request: AnyEnvelope, options?: RequestOptions): Promise<AnyEnvelope> {
    const { method, request: requestCodec, response: responseCodec } = this.#methodInfo(methodName);
    invariant(method.methodKind === 'unary', `Invalid RPC method call: response streaming mismatch. ${methodName}`);

    const handler = await this.#handler(method);
    const response = await handler(fromBinary(requestCodec, request.value), options);

    return create(AnySchema, {
      value: toBinary(responseCodec, response as Message),
      typeUrl: typeUrlFor(method.output),
    });
  }

  callStream(methodName: string, request: AnyEnvelope, options?: RequestOptions): Stream<AnyEnvelope> {
    const { method, request: requestCodec, response: responseCodec } = this.#methodInfo(methodName);
    invariant(
      method.methodKind === 'server_streaming',
      `Invalid RPC method call: response streaming mismatch., ${methodName}`,
    );

    const decoded = fromBinary(requestCodec, request.value);
    const responses = Stream.unwrapPromise(
      this.#handler(method).then((handler) => handler(decoded, options) as Stream<unknown>),
    );

    return Stream.map(responses, (data): AnyEnvelope =>
      create(AnySchema, { value: toBinary(responseCodec, data as Message), typeUrl: typeUrlFor(method.output) }),
    );
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
