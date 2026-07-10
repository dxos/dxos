//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.echo.query.QueryService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
// TODO(dmaretskyi): Copy jsdocs over from .proto files for service itself and each method.
export class Rpcs extends RpcGroup.make(
  Rpc.make('setConfig', {
    payload: protoMessage('dxos.echo.indexing.IndexConfig'),
    error: serviceError,
  }),
  Rpc.make('execQuery', {
    payload: protoMessage('dxos.echo.query.QueryRequest'),
    success: protoMessage('dxos.echo.query.QueryResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('reindex', {
    error: serviceError,
  }),
).prefix('QueryService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
