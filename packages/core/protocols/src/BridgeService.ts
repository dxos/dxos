//
// Copyright 2026 DXOS.org
//

import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import {
  BridgeEventSchema,
  CloseRequestSchema,
  ConnectionRequestSchema,
  DataRequestSchema,
  DetailsRequestSchema,
  DetailsResponseSchema,
  SignalRequestSchema,
  StatsRequestSchema,
  StatsResponseSchema,
} from './buf/proto/gen/dxos/mesh/bridge_pb.ts';
import { bufMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for the WebRTC transport bridge (`dxos.mesh.bridge.BridgeService`).
 * The tab exposes this to the worker over the system {@link MessagePort}; the worker consumes it to
 * proxy RTC connections through the tab's network stack. Payloads reuse the shared mesh proto types.
 *
 * Broker connections between processes and peers.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('open', {
    payload: bufMessage(ConnectionRequestSchema),
    success: bufMessage(BridgeEventSchema),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('sendSignal', {
    payload: bufMessage(SignalRequestSchema),
    error: serviceError,
  }),
  Rpc.make('sendData', {
    payload: bufMessage(DataRequestSchema),
    error: serviceError,
  }),
  Rpc.make('close', {
    payload: bufMessage(CloseRequestSchema),
    error: serviceError,
  }),
  Rpc.make('getDetails', {
    payload: bufMessage(DetailsRequestSchema),
    success: bufMessage(DetailsResponseSchema),
    error: serviceError,
  }),
  Rpc.make('getStats', {
    payload: bufMessage(StatsRequestSchema),
    success: bufMessage(StatsResponseSchema),
    error: serviceError,
  }),
).prefix('BridgeService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
