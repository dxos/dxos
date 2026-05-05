//
// Copyright 2026 DXOS.org
//

import { create, fromBinary, toBinary, type MessageInitShape } from '@bufbuild/protobuf';
import { AnySchema, type Any } from '@bufbuild/protobuf/wkt';

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

/** Bufbuild `google.protobuf.Any` — RPC request/response payload type. */
export { AnySchema, type Any };

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

/**
 * Worker-safe binary codec for `dxos.rpc.RpcMessage`.
 */
export const RpcMessageCodec = {
  encode: (value: RpcMessage | RpcMessageInit): Uint8Array =>
    toBinary(RpcMessageSchema, create(RpcMessageSchema, value)),
  decode: (bytes: Uint8Array): RpcMessage => fromBinary(RpcMessageSchema, bytes),
};
