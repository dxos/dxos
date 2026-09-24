//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import { describe, test } from 'vitest';

import { Rpc, makeClientServicesRpc } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { EffectEx } from '@dxos/effect';
import { RTCService } from '@dxos/protocols/rpc';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';

import { makeWorkerRuntime } from './worker-runtime.ts';

// The session server is otherwise only exercised through the worker framework, in `@dxos/client`.
describe('worker session server', () => {
  test('serves a streaming rpc from the stack implementations', { timeout: 30_000 }, async ({ expect }) => {
    await EffectEx.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const forward = new MessageChannel();
          const reverse = new MessageChannel();
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              forward.port1.close();
              forward.port2.close();
              reverse.port1.close();
              reverse.port2.close();
            }),
          );

          // The tab's side of the reverse direction: the worker's RTC client needs a peer to
          // finish its handshake, but nothing dials in this test, so every call is a test bug.
          const rtcHandlers = Object.fromEntries(
            [...RTCService.Rpcs.requests.keys()].map((tag) => [
              tag,
              () => Effect.die(new Error(`unexpected rtc call in this test: ${tag}`)),
            ]),
          );
          const rtcServer = Rpc.serve(reverse.port2, RTCService.Rpcs, RTCService.Rpcs.toLayer(rtcHandlers as never), {
            disableTracing: true,
          });
          yield* Effect.promise(() => rtcServer.open());
          yield* Effect.addFinalizer(() => Effect.promise(() => rtcServer.close()));

          const protocols = yield* Layer.build(
            Layer.merge(
              RpcServer.layerProtocolWorkerRunner.pipe(
                Layer.provide(BrowserWorkerRunner.layerMessagePort(forward.port2)),
              ),
              RpcClient.layerProtocolWorker({ size: 1, concurrency: Number.MAX_SAFE_INTEGER }).pipe(
                Layer.provide(BrowserWorker.layer(() => reverse.port1)),
              ),
            ).pipe(Layer.orDie),
          );

          const runtime = yield* makeWorkerRuntime({
            configProvider: Effect.sync(() => new Config({})),
            automaticallyConnectWebrtc: false,
            sqliteLayer: sqliteLayerMemory,
          });

          yield* Effect.gen(function* () {
            const appProtocol = yield* RpcServer.Protocol;
            const systemProtocol = yield* RpcClient.Protocol;
            yield* runtime.createSession({ appProtocol, systemProtocol });
          }).pipe(Effect.provide(protocols));

          const rpc = yield* makeClientServicesRpc(forward.port1);
          const statuses = yield* rpc['SystemService.queryStatus']({}).pipe(Stream.take(1), Stream.runCollect);
          expect([...statuses].length).toEqual(1);
        }),
      ),
    );
  });
});
