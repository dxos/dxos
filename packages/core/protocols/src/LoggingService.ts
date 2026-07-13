//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.LoggingService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('controlMetrics', {
    payload: protoMessage('dxos.client.services.ControlMetricsRequest'),
    success: protoMessage('dxos.client.services.ControlMetricsResponse'),
    error: serviceError,
  }),
  Rpc.make('queryMetrics', {
    payload: protoMessage('dxos.client.services.QueryMetricsRequest'),
    success: protoMessage('dxos.client.services.QueryMetricsResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('queryLogs', {
    payload: protoMessage('dxos.client.services.QueryLogsRequest'),
    success: protoMessage('dxos.client.services.LogEntry'),
    error: serviceError,
    stream: true,
  }),
).prefix('LoggingService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
