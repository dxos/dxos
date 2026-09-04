//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';

import { type Stream as PbStream } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { type BridgeService as BridgeServiceRpc } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { BridgeService } from '@dxos/protocols/rpc';

import * as Rpc from './Rpc';
import { pbStreamToStream, streamToPbStream } from './service-rpc';

/**
 * The system channel runs the WebRTC {@link BridgeServiceRpc} in the worker→tab direction: the worker
 * calls the tab's network stack to proxy RTC connections. It is served over its own {@link MessagePort}
 * (the reverse of the app port) via effect-rpc, replacing the legacy protobuf duplex peer.
 *
 * `BridgeServiceRpc` is the proto-shaped interface (`Promise`/{@link PbStream}) that
 * `RtcTransportService` implements and `RtcTransportProxyFactory` consumes; the helpers below adapt
 * it to and from the effect-rpc surface.
 */

const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

/**
 * Serves a proto-shaped {@link BridgeServiceRpc} (the tab's `RtcTransportService`) over a
 * {@link MessagePort} via effect-rpc. The worker consumes it with {@link makeBridgeServiceClient}.
 */
export const serveBridgeService = (port: MessagePort, service: BridgeServiceRpc): Rpc.GroupServer => {
  const unary =
    <Req, Res>(method: (request: Req) => Promise<Res>) =>
    (payload: Req) =>
      Effect.tryPromise({ try: () => method(payload), catch: toError });

  const handlers = {
    'BridgeService.open': (payload: Parameters<BridgeServiceRpc['open']>[0]) =>
      pbStreamToStream(() => service.open(payload)),
    'BridgeService.sendSignal': unary((request: Parameters<BridgeServiceRpc['sendSignal']>[0]) =>
      service.sendSignal(request),
    ),
    'BridgeService.sendData': unary((request: Parameters<BridgeServiceRpc['sendData']>[0]) =>
      service.sendData(request),
    ),
    'BridgeService.close': unary((request: Parameters<BridgeServiceRpc['close']>[0]) => service.close(request)),
    'BridgeService.getDetails': unary((request: Parameters<BridgeServiceRpc['getDetails']>[0]) =>
      service.getDetails(request),
    ),
    'BridgeService.getStats': unary((request: Parameters<BridgeServiceRpc['getStats']>[0]) =>
      service.getStats(request),
    ),
  };

  // Dispatched dynamically across the group; per-method handler types cannot be expressed statically.
  return Rpc.serve(port, BridgeService.Rpcs, BridgeService.Rpcs.toLayer(handlers as never), {
    disableTracing: true,
    concurrency: 'unbounded',
  });
};

/**
 * Builds a proto-shaped {@link BridgeServiceRpc} backed by an effect-rpc client over a
 * {@link MessagePort}. Used in the worker to hand `RtcTransportProxyFactory` a bridge that proxies to
 * the tab. The returned `close` releases the transport scope.
 */
export const makeBridgeServiceClient = async (
  port: MessagePort,
): Promise<{ bridgeService: BridgeServiceRpc; close: () => Promise<void> }> =>
  bridgeServiceClientFromEffect((scope) => Rpc.makeClient(port, BridgeService.Rpcs).pipe(Scope.provide(scope)));

/**
 * Builds a proto-shaped {@link BridgeServiceRpc} over a pre-built {@link RpcClient.Protocol} (the
 * value the tag resolves to — e.g. the worker→client protocol handed to a worker-framework session
 * via effect context) rather than a raw {@link MessagePort}.
 */
export const makeBridgeServiceClientOverProtocol = async (
  protocol: RpcClient.Protocol['Service'],
): Promise<{ bridgeService: BridgeServiceRpc; close: () => Promise<void> }> =>
  bridgeServiceClientFromEffect((scope) =>
    Rpc.makeClientOverProtocol(Layer.succeed(RpcClient.Protocol, protocol), BridgeService.Rpcs).pipe(
      Scope.provide(scope),
    ),
  );

/** Adapts an effect-rpc {@link BridgeService.Client} (built by the caller) to the proto-shaped surface. */
const bridgeServiceClientFromEffect = async (
  makeClient: (scope: Scope.Scope) => Effect.Effect<unknown, never, never>,
): Promise<{ bridgeService: BridgeServiceRpc; close: () => Promise<void> }> => {
  const scope = Effect.runSync(Scope.make());
  const client = (await EffectEx.runPromise(makeClient(scope))) as BridgeService.Client;

  const bridgeService: BridgeServiceRpc = {
    open: (request) => streamToPbStream(Context.empty(), client['BridgeService.open'](request)),
    sendSignal: (request) => EffectEx.runPromise(client['BridgeService.sendSignal'](request)),
    sendData: (request) => EffectEx.runPromise(client['BridgeService.sendData'](request)),
    close: (request) => EffectEx.runPromise(client['BridgeService.close'](request)),
    getDetails: (request) => EffectEx.runPromise(client['BridgeService.getDetails'](request)),
    getStats: (request) => EffectEx.runPromise(client['BridgeService.getStats'](request)),
  };

  return {
    bridgeService,
    close: async () => {
      await EffectEx.runPromise(Scope.close(scope, Exit.void));
    },
  };
};
