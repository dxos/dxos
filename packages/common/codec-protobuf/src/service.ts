//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import pb from 'protobufjs';

import type { Schema } from './schema';
import { Stream } from './stream';

export interface ServiceBackend {
  call (method: string, request: Uint8Array): Promise<Uint8Array>;
  callStream (method: string, request: Uint8Array): Stream<Uint8Array>;
}

export class ServiceDescriptor<S> {
  constructor (
    private readonly _service: pb.Service,
    private readonly _schema: Schema<any>
  ) {}

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
      const responseCodec = schema.tryGetCodecForType(method.resolvedResponseType.fullName)

      ; (this as any)[method.name] = async (request: unknown) => {
        const encoded = requestCodec.encode(request);

        if (method.responseStream) {
          return new Stream(({ next, close }) => {
            const stream = backend.callStream(method.name, encoded);
            stream.subscribe(data => next(responseCodec.decode(data)), close);

            return () => stream.close();
          });
        } else {
          const response = await backend.call(method.name, encoded);
          return responseCodec.decode(response);
        }
      };
    }
  }
}

export class ServiceHandler<S = {}> implements ServiceBackend {
  constructor (
    private readonly _service: pb.Service,
    private readonly _schema: Schema<any>,
    private readonly _handlers: S
  ) {}

  async call (methodName: string, request: Uint8Array): Promise<Uint8Array> {
    const { method, requestCodec, responseCodec } = this._getMethodInfo(methodName);
    assert(!method.requestStream, 'Invalid RPC method call: request streaming mismatch.');
    assert(!method.responseStream, 'Invalid RPC method call: response streaming mismatch.');

    const requestDecoded = requestCodec.decode(request);

    const handler = this._handlers[methodName as keyof S];
    assert(handler, `Handler is missing: ${methodName}`);

    const response = await (handler as any)(requestDecoded);

    const responseEncoded = responseCodec.encode(response);

    return responseEncoded;
  }

  callStream (methodName: string, request: Uint8Array): Stream<Uint8Array> {
    const { method, requestCodec, responseCodec } = this._getMethodInfo(methodName);
    assert(!method.requestStream, 'Invalid RPC method call: request streaming mismatch.');
    assert(method.responseStream, 'Invalid RPC method call: response streaming mismatch.');

    const requestDecoded = requestCodec.decode(request);

    const handler = this._handlers[methodName as keyof S];
    assert(handler, `Handler is missing: ${methodName}`);

    const responseStream = (handler as any)(requestDecoded) as Stream<unknown>;
    return new Stream<Uint8Array>(({ next, close }) => {
      responseStream.subscribe(data => next(responseCodec.encode(data)), close);
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
