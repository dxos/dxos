//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.NetworkService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('updateConfig', {
    payload: protoMessage('dxos.client.services.UpdateConfigRequest'),
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
  Rpc.make('querySwarm', {
    payload: protoMessage('dxos.edge.signal.QueryRequest'),
    success: protoMessage('dxos.edge.messenger.SwarmResponse'),
    error: serviceError,
  }),
  Rpc.make('subscribeSwarmState', {
    payload: protoMessage('dxos.client.services.SubscribeSwarmStateRequest'),
    success: protoMessage('dxos.edge.messenger.SwarmResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('sendMessage', {
    payload: protoMessage('dxos.edge.signal.Message'),
    error: serviceError,
  }),
  Rpc.make('subscribeMessages', {
    payload: protoMessage('dxos.edge.messenger.Peer'),
    success: protoMessage('dxos.edge.signal.Message'),
    error: serviceError,
    stream: true,
  }),
).prefix('NetworkService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
