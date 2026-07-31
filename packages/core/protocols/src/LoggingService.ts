//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { protoMessage, serviceError } from './service-rpc.ts';
import { mutableArray, protoTimestamp } from './service-schemas.ts';

//
// RPC message schemas.
//

export const ControlMetricsRequest = Schema.Struct({
  reset: Schema.optional(Schema.Boolean),
  record: Schema.optional(Schema.Boolean),
});
export interface ControlMetricsRequest extends Schema.Schema.Type<typeof ControlMetricsRequest> {}

export const ControlMetricsResponse = Schema.Struct({
  recording: Schema.optional(Schema.Boolean),
});
export interface ControlMetricsResponse extends Schema.Schema.Type<typeof ControlMetricsResponse> {}

export const QueryMetricsRequest = Schema.Struct({
  interval: Schema.optional(Schema.Number),
});
export interface QueryMetricsRequest extends Schema.Schema.Type<typeof QueryMetricsRequest> {}

export const Value = Schema.Struct({
  bool: Schema.optional(Schema.Boolean),
  string: Schema.optional(Schema.String),
  int: Schema.optional(Schema.Number),
  float: Schema.optional(Schema.Number),
});
export interface Value extends Schema.Schema.Type<typeof Value> {}

export const Stats = Schema.Struct({
  min: Schema.optional(Schema.Number),
  max: Schema.optional(Schema.Number),
  mean: Schema.optional(Schema.Number),
  median: Schema.optional(Schema.Number),
  total: Schema.optional(Schema.Number),
  count: Schema.optional(Schema.Number),
});
export interface Stats extends Schema.Schema.Type<typeof Stats> {}

export const KeyPair = Schema.Struct({
  key: Schema.optional(Schema.String),
  value: Schema.optional(Value),
  stats: Schema.optional(Stats),
});
export interface KeyPair extends Schema.Schema.Type<typeof KeyPair> {}

export const Metrics = Schema.Struct({
  timestamp: protoTimestamp,
  values: Schema.optional(mutableArray(KeyPair)),
});
export interface Metrics extends Schema.Schema.Type<typeof Metrics> {}

export const QueryMetricsResponse = Schema.Struct({
  timestamp: protoTimestamp,
  metrics: Metrics,
});
export interface QueryMetricsResponse extends Schema.Schema.Type<typeof QueryMetricsResponse> {}

/**
 * Effect RPC definitions for `dxos.client.services.LoggingService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('controlMetrics', {
    payload: ControlMetricsRequest,
    success: ControlMetricsResponse,
    error: serviceError,
  }),
  Rpc.make('queryMetrics', {
    payload: QueryMetricsRequest,
    success: QueryMetricsResponse,
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
