//
// Copyright 2026 DXOS.org
//

import { create, fromBinary, toBinary, type MessageInitShape } from '@bufbuild/protobuf';
import type { Any as BufAny } from '@bufbuild/protobuf/wkt';

import {
  type Bye,
  ByeSchema,
  type MessageTrace,
  MessageTrace_Direction,
  type Request,
  RequestSchema,
  type Response,
  ResponseSchema,
  type RpcMessage,
  RpcMessageSchema,
  type StreamClose,
  StreamCloseSchema,
  type TraceContext,
  TraceContextSchema,
} from '@dxos/protocols/buf/dxos/rpc_pb';

export {
  type Bye,
  ByeSchema,
  type MessageTrace,
  MessageTrace_Direction,
  type Request,
  RequestSchema,
  type Response,
  ResponseSchema,
  type RpcMessage,
  RpcMessageSchema,
  type StreamClose,
  StreamCloseSchema,
  type TraceContext,
  TraceContextSchema,
};

/**
 * Init shape for {@link RpcMessage}. Accepts the partial discriminated-union form
 * (e.g. `{ content: { case: 'open', value: true } }`) and `create()` will fill in the rest.
 */
export type RpcMessageInit = MessageInitShape<typeof RpcMessageSchema>;

/**
 * Options retained for source compatibility with the legacy `@dxos/codec-protobuf` API surface.
 */
export interface RpcCodecOptions {
  /**
   * No-op flag retained for source compatibility.
   *
   * The legacy protobufjs codec used `preserveAny: true` to opt out of recursive
   * decoding of `google.protobuf.Any` payloads. The bufbuild-backed codec here
   * never decodes `Any` recursively, so this flag has no effect.
   *
   * @deprecated The codec always preserves `Any` payloads.
   */
  preserveAny?: boolean;
}

export interface BinaryCodec<T, TInit = T> {
  /** Accepts either a fully-constructed message or its `MessageInitShape` partial form. */
  encode(value: T | TInit, options?: RpcCodecOptions): Uint8Array;
  decode(bytes: Uint8Array, options?: RpcCodecOptions): T;
}

/**
 * Worker-safe binary codec for `dxos.rpc.RpcMessage`.
 *
 * Backed by `@bufbuild/protobuf` static descriptors. Does not pull in `protobufjs`
 * reflection, `@protobufjs/codegen`, or `@dxos/codec-protobuf` at runtime, and is
 * therefore safe to use inside Cloudflare Workers / `workerd`, where dynamic code
 * generation via `Function(...)` is forbidden.
 *
 * Wire-compatible with the legacy `protobufjs` codec — both produce/consume the
 * standard proto3 wire format for the same descriptor.
 */
export const RpcMessageCodec: BinaryCodec<RpcMessage, RpcMessageInit> = {
  encode: (value, _options) => toBinary(RpcMessageSchema, create(RpcMessageSchema, value)),
  decode: (bytes, _options) => fromBinary(RpcMessageSchema, bytes),
};

/**
 * Construct a typed {@link RpcMessage} from the partial init shape.
 *
 * Provided so call sites in `@dxos/rpc` do not need to import `@bufbuild/protobuf`
 * directly to build outgoing envelopes.
 */
export const createRpcMessage = (init: RpcMessageInit): RpcMessage => create(RpcMessageSchema, init);

/**
 * Protobufjs-shape `Any` — the public payload surface of `@dxos/codec-protobuf`.
 *
 * Defined here (rather than imported from `@dxos/codec-protobuf`) so the boundary
 * translation has no value-level dependency on the legacy codec package.
 */
export interface CodecAny {
  '@type': 'google.protobuf.Any';
  type_url: string;
  value: Uint8Array;
}

/** Translate protobufjs-shape `Any` to bufbuild `Any` for outgoing wire payloads. */
export function toBufAny(any: { type_url?: string; value?: Uint8Array }): BufAny;
export function toBufAny(any: { type_url?: string; value?: Uint8Array } | undefined): BufAny | undefined;
export function toBufAny(any: { type_url?: string; value?: Uint8Array } | undefined): BufAny | undefined {
  if (!any) {
    return undefined;
  }
  return {
    $typeName: 'google.protobuf.Any',
    typeUrl: any.type_url ?? '',
    value: any.value ?? new Uint8Array(),
  };
}

/**
 * Translate bufbuild `Any` to protobufjs-shape `Any` for inbound payloads handed to consumers.
 *
 * The legacy `@dxos/codec-protobuf` codec returns `value` as a Node `Buffer` in Node and a
 * `Uint8Array` in browser. We preserve that behavior here so existing equality checks
 * (`expect(x.value).toEqual(Buffer.from(...))`) keep working unchanged.
 */
export function toCodecAny(any: BufAny): CodecAny;
export function toCodecAny(any: BufAny | undefined): CodecAny | undefined;
export function toCodecAny(any: BufAny | undefined): CodecAny | undefined {
  if (!any) {
    return undefined;
  }
  const BufferCtor = (globalThis as any).Buffer;
  const value = BufferCtor ? BufferCtor.from(any.value.buffer, any.value.byteOffset, any.value.byteLength) : any.value;
  return {
    '@type': 'google.protobuf.Any',
    type_url: any.typeUrl,
    value,
  };
}
