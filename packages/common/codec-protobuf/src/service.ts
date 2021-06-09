//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import pb from 'protobufjs';

import type { Schema } from './schema';

export interface ServiceBackend {
  call (method: string, request: Uint8Array): Promise<Uint8Array>;
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
      assert(!method.responseStream, 'Streaming RPC responses are not supported.');

      // TODO(marik-d): What about primitive types.
      const requestCodec = schema.tryGetCodecForType(method.resolvedRequestType.fullName);
      const responseCodec = schema.tryGetCodecForType(method.resolvedResponseType.fullName)

      ; (this as any)[method.name] = async (request: unknown) => {
        const encoded = requestCodec.encode(request);
        const response = await backend.call(method.name, encoded);
        return responseCodec.decode(response);
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
    const method = this._service.methods[methodName];
    assert(!!method, `Method not found: ${methodName}`);

    method.resolve();
    assert(method.resolvedRequestType);
    assert(method.resolvedResponseType);

    const requestCodec = this._schema.tryGetCodecForType(method.resolvedRequestType.fullName);
    const responseCodec = this._schema.tryGetCodecForType(method.resolvedResponseType.fullName);

    const requestDecoded = requestCodec.decode(request);

    const handler = this._handlers[methodName as keyof S];
    assert(handler, `Handler is missing: ${methodName}`);

    const response = await (handler as any)(requestDecoded);

    const responseEncoded = responseCodec.encode(response);

    return responseEncoded;
  }
}
