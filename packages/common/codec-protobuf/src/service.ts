//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import pb from 'protobufjs';

import type { Schema } from './schema';
import { Stream } from './stream';

export interface Any {
  'type_url': string;
  value: Uint8Array;
}

export interface ServiceBackend {
  call (method: string, request: Any): Promise<Any>;
  callStream (method: string, request: Any): Stream<Any>;
}

export class ServiceDescriptor<S> {
  constructor (
    private readonly _service: pb.Service,
    private readonly _schema: Schema<any>
  ) {}

  get serviceProto (): pb.Service {
    return this._service;
  }

  createClient (backend: ServiceBackend): Service & S {
    return new Service(backend, this._service, this._schema) as Service & S;
  }

  createServer (handlers: S): ServiceHandler<S> {
    return new ServiceHandler(this._service, this._schema, handlers);
  }
}

export class Service {
  constructor (
    backend: ServiceBackend,
    service: pb.Service,
    schema: Schema<any>
  ) {
    for (const method of service.methodsArray) {
      method.resolve();
      assert(method.resolvedRequestType);
      assert(method.resolvedResponseType);
      assert(!method.requestStream, 'Streaming RPC requests are not supported.');

      // TODO(marik-d): What about primitive types.
      const requestCodec = schema.tryGetCodecForType(method.resolvedRequestType.fullName);
      const responseCodec = schema.tryGetCodecForType(method.resolvedResponseType.fullName);
      const methodName = mapRpcMethodName(method.name);

      if (!method.responseStream) {
        (this as any)[methodName] = async (request: unknown) => {
          const encoded = requestCodec.encode(request);
          const response = await backend.call(method.name, {
            value: encoded,
            type_url: method.resolvedRequestType!.fullName
          });
          return responseCodec.decode(response.value!);
        };
      } else {
        (this as any)[methodName] = (request: unknown) => {
          const encoded = requestCodec.encode(request);
          return new Stream(({ next, close }) => {
            const stream = backend.callStream(method.name, {
              value: encoded,
              type_url: method.resolvedRequestType!.fullName
            });
            stream.subscribe(data => next(responseCodec.decode(data.value!)), close);

            return () => stream.close();
          });
        };
      }

      // Set function name so that is properly named in stack traces.
      Object.defineProperty((this as any)[methodName], 'name', { value: methodName });
    }
  }
}

export class ServiceHandler<S = {}> implements ServiceBackend {
  constructor (
    private readonly _service: pb.Service,
    private readonly _schema: Schema<any>,
    private readonly _handlers: S
  ) {}

  async call (methodName: string, request: Any): Promise<Any> {
    const { method, requestCodec, responseCodec } = this._getMethodInfo(methodName);
    assert(!method.requestStream, 'Invalid RPC method call: request streaming mismatch.');
    assert(!method.responseStream, `Invalid RPC method call: response streaming mismatch. ${methodName}`);

    const mappedMethodName = mapRpcMethodName(methodName);

    const handler = this._handlers[mappedMethodName as keyof S];
    assert(handler, `Handler is missing: ${mappedMethodName}`);

    const requestDecoded = requestCodec.decode(request.value!);
    const response = await (handler as any).bind(this._handlers)(requestDecoded);
    const responseEncoded = responseCodec.encode(response);

    return {
      value: responseEncoded,
      type_url: method.resolvedResponseType!.fullName
    };
  }

  callStream (methodName: string, request: Any): Stream<Any> {
    const { method, requestCodec, responseCodec } = this._getMethodInfo(methodName);
    assert(!method.requestStream, 'Invalid RPC method call: request streaming mismatch.');
    assert(method.responseStream, `Invalid RPC method call: response streaming mismatch., ${methodName}`);

    const mappedMethodName = mapRpcMethodName(methodName);

    const handler = this._handlers[mappedMethodName as keyof S];
    assert(handler, `Handler is missing: ${mappedMethodName}`);

    const requestDecoded = requestCodec.decode(request.value!);
    const responseStream = (handler as any).bind(this._handlers)(requestDecoded) as Stream<unknown>;
    return new Stream<Any>(({ next, close }) => {
      responseStream.subscribe(data => next({
        value: responseCodec.encode(data),
        type_url: method.resolvedResponseType!.fullName
      }), close);
      return () => responseStream.close();
    });
  }

  private _getMethodInfo (methodName: string) {
    const method = this._service.methods[methodName];
    assert(!!method, `Method not found: ${methodName}`);

    method.resolve();
    assert(method.resolvedRequestType);
    assert(method.resolvedResponseType);

    const requestCodec = this._schema.tryGetCodecForType(method.resolvedRequestType.fullName);
    const responseCodec = this._schema.tryGetCodecForType(method.resolvedResponseType.fullName);

    return { method, requestCodec, responseCodec };
  }
}

const mapRpcMethodName = (name: string) => name[0].toLocaleLowerCase() + name.substring(1);
