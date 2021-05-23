import pb from 'protobufjs'
import type {Schema} from "./schema";
import assert from "assert";

export interface ServiceBackend {
  call (method: string, request: Uint8Array): Promise<Uint8Array>;
}

export class ServiceDescriptor<S> {
  constructor(
    private readonly _service: pb.Service,
    private readonly _schema: Schema<any>,
  ) {}

  instantiate(backend: ServiceBackend): Service & S {
    return new Service(backend, this._service, this._schema) as Service & S
  }
}

export class Service {
  constructor(
    private readonly _backend: ServiceBackend,
    private readonly _service: pb.Service,
    private readonly _schema: Schema<any>,
  ) {
    for(const method of _service.methodsArray) {
      method.resolve()
      assert(method.resolvedRequestType)
      assert(method.resolvedResponseType)
      assert(!method.requestStream, 'Streaming RPC requests are not supported.');
      assert(!method.responseStream, 'Streaming RPC responses are not supported.');

      // TODO(marik-d): What about primitive types.
      const requestCodec = _schema.tryGetCodecForType(method.resolvedRequestType.fullName)
      const responseCodec = _schema.tryGetCodecForType(method.resolvedResponseType.fullName)

      ; (this as any)[method.name] = async (request: unknown) => {
        const encoded = requestCodec.encode(request)
        const response = await _backend.call(method.name, encoded);
        return responseCodec.decode(response)
      }
    }
  }
}