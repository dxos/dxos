//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';
import { protoStruct, protoTimestamp } from './service-schemas.ts';

//
// RPC message schemas.
//

export const KeyOption = Schema.Enums({
  NONE: 0,
  TRUNCATE: 1,
  HUMANIZE: 2,
});
export type KeyOption = Schema.Schema.Type<typeof KeyOption>;

export const GetDiagnosticsRequest = Schema.Struct({
  keys: Schema.optional(KeyOption),
});
export interface GetDiagnosticsRequest extends Schema.Schema.Type<typeof GetDiagnosticsRequest> {}

export const GetDiagnosticsResponse = Schema.Struct({
  timestamp: protoTimestamp,
  diagnostics: protoStruct,
});
export interface GetDiagnosticsResponse extends Schema.Schema.Type<typeof GetDiagnosticsResponse> {}

export const SystemStatus = Schema.Enums({
  INACTIVE: 0,
  ACTIVE: 1,
});
export type SystemStatus = Schema.Schema.Type<typeof SystemStatus>;

export const UpdateStatusRequest = Schema.Struct({
  status: SystemStatus,
});
export interface UpdateStatusRequest extends Schema.Schema.Type<typeof UpdateStatusRequest> {}

export const QueryStatusRequest = Schema.Struct({
  interval: Schema.optional(Schema.Number),
});
export interface QueryStatusRequest extends Schema.Schema.Type<typeof QueryStatusRequest> {}

export const QueryStatusResponse = Schema.Struct({
  status: SystemStatus,
});
export interface QueryStatusResponse extends Schema.Schema.Type<typeof QueryStatusResponse> {}

/**
 * Effect RPC definitions for `dxos.client.services.SystemService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  /**
   * Get the static config of the client.
   */
  Rpc.make('getConfig', {
    success: protoMessage('dxos.config.Config'),
    error: serviceError,
  }),
  /**
   * Get the diagnostics snapshot.
   */
  Rpc.make('getDiagnostics', {
    payload: GetDiagnosticsRequest,
    success: GetDiagnosticsResponse,
    error: serviceError,
  }),
  /**
   * Update the status of the client. Used to re-activate an inactive client.
   */
  Rpc.make('updateStatus', {
    payload: UpdateStatusRequest,
    error: serviceError,
  }),
  /**
   * Stream the status of the client.
   */
  Rpc.make('queryStatus', {
    payload: QueryStatusRequest,
    success: QueryStatusResponse,
    error: serviceError,
    stream: true,
  }),
  /**
   * Reset the client.
   */
  Rpc.make('reset', {
    error: serviceError,
  }),
  /**
   * Get platform Information
   */
  Rpc.make('getPlatform', {
    success: protoMessage('dxos.client.services.Platform'),
    error: serviceError,
  }),
).prefix('SystemService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
