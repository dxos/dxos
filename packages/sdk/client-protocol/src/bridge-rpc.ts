//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Runtime from 'effect/Runtime';
import * as Scope from 'effect/Scope';

import { type Stream as PbStream } from '@dxos/codec-protobuf/stream';
import { EffectEx } from '@dxos/effect';
import { type BridgeService as BridgeServiceRpc } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { BridgeService } from '@dxos/protocols/rpc';
import { type RpcGroupServer, makeRpcClient, serveRpcGroup } from '@dxos/worker-framework';

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
export const serveBridgeService = (port: MessagePort, service: BridgeServiceRpc): RpcGroupServer => {
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
  return serveRpcGroup(port, BridgeService.Rpcs, BridgeService.Rpcs.toLayer(handlers as never), {
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
): Promise<{ bridgeService: BridgeServiceRpc; close: () => Promise<void> }> => {
  const scope = Effect.runSync(Scope.make());
  const client = (await EffectEx.runPromise(
    makeRpcClient(port, BridgeService.Rpcs).pipe(Scope.extend(scope)),
  )) as BridgeService.Client;

  const bridge = client.BridgeService;
  const bridgeService: BridgeServiceRpc = {
    open: (request) => streamToPbStream(Runtime.defaultRuntime, bridge.open(request)),
    sendSignal: (request) => EffectEx.runPromise(bridge.sendSignal(request)),
    sendData: (request) => EffectEx.runPromise(bridge.sendData(request)),
    close: (request) => EffectEx.runPromise(bridge.close(request)),
    getDetails: (request) => EffectEx.runPromise(bridge.getDetails(request)),
    getStats: (request) => EffectEx.runPromise(bridge.getStats(request)),
  };

  return {
    bridgeService,
    close: async () => {
      await EffectEx.runPromise(Scope.close(scope, Exit.void));
    },
  };
};
