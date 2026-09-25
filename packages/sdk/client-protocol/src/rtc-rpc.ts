//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';

import { normalizeHandlers } from '@dxos/protocols';
import { RTCService } from '@dxos/protocols/rpc';

import * as Rpc from './Rpc.ts';

/**
 * The system channel runs the WebRTC {@link RTCService} in the worker→tab direction: the worker asks
 * the tab to establish a peer connection, and the tab transfers the resulting `RTCDataChannel` back
 * over the same {@link MessagePort} (the reverse of the app port). Only signalling and the handover
 * itself cross the boundary.
 */

/** Serves the tab's {@link RTCService} implementation (`RtcService`) to the worker over a {@link MessagePort}. */
export const serveRtcService = (port: MessagePort, service: RTCService.Handlers): Rpc.GroupServer =>
  Rpc.serve(
    port,
    RTCService.Rpcs,
    // `toLayer` widens the requirement to `any` for a handlers value typed by the group's interface,
    // though the handlers need no services; narrowed the same way as `makeClientServicesHandlers`.
    RTCService.Rpcs.toLayer(normalizeHandlers(RTCService.Rpcs, service) as never),
    { disableTracing: true, concurrency: 'unbounded' },
  );

/** Builds the worker's {@link RTCService} client for the tab's implementation, over a {@link MessagePort}. */
export const makeRtcServiceClient = (port: MessagePort): Effect.Effect<RTCService.Client, never, Scope.Scope> =>
  Rpc.makeClient(port, RTCService.Rpcs) as Effect.Effect<RTCService.Client, never, Scope.Scope>;

/**
 * Builds the worker's client over a pre-built {@link RpcClient.Protocol} — the value the tag resolves
 * to, e.g. the worker→client protocol handed to a worker-framework session via effect context.
 */
export const makeRtcServiceClientOverProtocol = (
  protocol: RpcClient.Protocol['Service'],
): Effect.Effect<RTCService.Client, never, Scope.Scope> =>
  Rpc.makeClientOverProtocol(Layer.succeed(RpcClient.Protocol, protocol), RTCService.Rpcs) as Effect.Effect<
    RTCService.Client,
    never,
    Scope.Scope
  >;
