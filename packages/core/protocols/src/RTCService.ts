//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as Transferable from 'effect/unstable/workers/Transferable';

import {
  CloseRequestSchema,
  ConnectionRequestSchema,
  DetailsRequestSchema,
  DetailsResponseSchema,
  SignalRequestSchema,
  StatsRequestSchema,
  StatsResponseSchema,
} from './buf/proto/gen/dxos/mesh/rtc_pb.ts';
import { SignalSchema } from './buf/proto/gen/dxos/mesh/swarm_pb.ts';
import { bufMessage, serviceError } from './service-rpc.ts';

/**
 * Opens a connection, and hands the caller the channel it establishes.
 *
 * `channelPort` is the caller's end of a dedicated {@link MessageChannel}, transferred with the
 * request; the service posts the `RTCDataChannel` to it — transferred, not copied — the moment it
 * exists. The channel cannot ride the response stream instead: a browser only lets an
 * `RTCDataChannel` be transferred in the same task it was created in, and a stream chunk is encoded
 * and sent a task later.
 */
export const OpenRequest = Schema.Struct({
  request: bufMessage(ConnectionRequestSchema),
  channelPort: Transferable.MessagePort,
});

export type OpenRequest = typeof OpenRequest.Type;

/**
 * Effect RPC definitions for the WebRTC proxy service.
 *
 * The tab owns the `RTCPeerConnection` (a worker has no access to the page's network stack) and
 * exposes this over the system {@link MessagePort}; the worker consumes it and, once the channel
 * lands on its `channelPort`, reads and writes that channel directly. Only signalling crosses the
 * rpc boundary — never connection data.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('open', {
    payload: OpenRequest,
    /** Signalling messages to forward to the remote peer. Ends (or fails) when the connection closes. */
    success: bufMessage(SignalSchema),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('sendSignal', {
    payload: bufMessage(SignalRequestSchema),
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
).prefix('RTCService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
