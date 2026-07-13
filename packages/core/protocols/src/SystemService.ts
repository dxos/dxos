//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.SystemService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('getConfig', {
    success: protoMessage('dxos.config.Config'),
    error: serviceError,
  }),
  Rpc.make('getDiagnostics', {
    payload: protoMessage('dxos.client.services.GetDiagnosticsRequest'),
    success: protoMessage('dxos.client.services.GetDiagnosticsResponse'),
    error: serviceError,
  }),
  Rpc.make('updateStatus', {
    payload: protoMessage('dxos.client.services.UpdateStatusRequest'),
    error: serviceError,
  }),
  Rpc.make('queryStatus', {
    payload: protoMessage('dxos.client.services.QueryStatusRequest'),
    success: protoMessage('dxos.client.services.QueryStatusResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('reset', {
    error: serviceError,
  }),
  Rpc.make('getPlatform', {
    success: protoMessage('dxos.client.services.Platform'),
    error: serviceError,
  }),
).prefix('SystemService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
