//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for the WebRTC transport bridge (`dxos.mesh.bridge.BridgeService`).
 * The tab exposes this to the worker over the system {@link MessagePort}; the worker consumes it to
 * proxy RTC connections through the tab's network stack. Payloads reuse the shared mesh proto types.
 *
 * Broker connections between processes and peers.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('open', {
    payload: protoMessage('dxos.mesh.bridge.ConnectionRequest'),
    success: protoMessage('dxos.mesh.bridge.BridgeEvent'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('sendSignal', {
    payload: protoMessage('dxos.mesh.bridge.SignalRequest'),
    error: serviceError,
  }),
  Rpc.make('sendData', {
    payload: protoMessage('dxos.mesh.bridge.DataRequest'),
    error: serviceError,
  }),
  Rpc.make('close', {
    payload: protoMessage('dxos.mesh.bridge.CloseRequest'),
    error: serviceError,
  }),
  Rpc.make('getDetails', {
    payload: protoMessage('dxos.mesh.bridge.DetailsRequest'),
    success: protoMessage('dxos.mesh.bridge.DetailsResponse'),
    error: serviceError,
  }),
  Rpc.make('getStats', {
    payload: protoMessage('dxos.mesh.bridge.StatsRequest'),
    success: protoMessage('dxos.mesh.bridge.StatsResponse'),
    error: serviceError,
  }),
).prefix('BridgeService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
