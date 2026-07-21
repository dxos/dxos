//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

import { protoMessage, serviceError } from './service-rpc.ts';
import { publicKey } from './service-schemas.ts';

//
// RPC message schemas.
//

export const ConnectionState = Schema.Enums({
  OFFLINE: 0,
  ONLINE: 1,
});
export type ConnectionState = Schema.Schema.Type<typeof ConnectionState>;

export const UpdateConfigRequest = Schema.Struct({
  swarm: ConnectionState,
});
export interface UpdateConfigRequest extends Schema.Schema.Type<typeof UpdateConfigRequest> {}

export const SubscribeSwarmStateRequest = Schema.Struct({
  topic: publicKey,
});
export interface SubscribeSwarmStateRequest extends Schema.Schema.Type<typeof SubscribeSwarmStateRequest> {}

/**
 * Effect RPC definitions for `dxos.client.services.NetworkService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('updateConfig', {
    payload: UpdateConfigRequest,
    error: serviceError,
  }),
  Rpc.make('queryStatus', {
    success: protoMessage('dxos.client.services.NetworkStatus'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('joinSwarm', {
    payload: protoMessage('dxos.edge.signal.JoinRequest'),
    error: serviceError,
  }),
  Rpc.make('leaveSwarm', {
    payload: protoMessage('dxos.edge.signal.LeaveRequest'),
    error: serviceError,
  }),
  /**
   * Query the swarm state without joining it.
   */
  Rpc.make('querySwarm', {
    payload: protoMessage('dxos.edge.signal.QueryRequest'),
    success: protoMessage('dxos.edge.messenger.SwarmResponse'),
    error: serviceError,
  }),
  Rpc.make('subscribeSwarmState', {
    payload: SubscribeSwarmStateRequest,
    success: protoMessage('dxos.edge.messenger.SwarmResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('sendMessage', {
    payload: protoMessage('dxos.edge.signal.Message'),
    error: serviceError,
  }),
  Rpc.make('subscribeMessages', {
    payload: protoMessage('dxos.edge.signal.SubscribeMessagesRequest'),
    success: protoMessage('dxos.edge.signal.Message'),
    error: serviceError,
    stream: true,
  }),
).prefix('NetworkService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `NetworkService` RPC handlers.
 */
export class Tag extends Context.Tag('@dxos/protocols/rpc/NetworkService')<Tag, Handlers>() {}
