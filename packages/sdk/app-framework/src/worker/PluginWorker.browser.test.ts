//
// Copyright 2026 DXOS.org
//

// Also loaded in the page so the dep optimizer discovers the worker's graph before the worker
// starts: found later, the optimizer reloads mid-test and takes the worker down with it.
import './PluginWorker.ts';
import './testing/echo-worker-module.ts';

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcServer from 'effect/rpc/RpcServer';
import * as Scope from 'effect/Scope';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Client from '@dxos/worker-framework/Client';
import * as Coordinator from '@dxos/worker-framework/Coordinator';

import * as Capabilities from '../common/capabilities.ts';
import { EchoRpcs, TabRpcs } from './testing/echo-rpcs.ts';
import * as WorkerCapabilities from './WorkerCapabilities.ts';

/** The echo module as a tab sends it: the worker loads its body by URL. */
const echoModule = {
  plugin: 'org.dxos.test.echoWorker',
  id: 'Echo',
  url: new URL('./testing/echo-worker-module.ts', import.meta.url).href,
  requires: [{ identifier: WorkerCapabilities.Host.identifier, arity: WorkerCapabilities.Host.arity }],
  provides: [{ identifier: Capabilities.LayerSpec.identifier, arity: Capabilities.LayerSpec.arity }],
};

/** A client for the worker's echo RPCs over the tab's forward port. */
const makeEchoClient = Effect.fnUntraced(function* (port: MessagePort) {
  // Built into the caller's scope: `Effect.provide` would release the transport as soon as the
  // client is made, interrupting every call on it.
  const protocol = yield* Layer.build(
    RpcClient.layerProtocolWorker({ size: 1 }).pipe(Layer.provide(BrowserWorker.layer(() => port))),
  );
  return yield* RpcClient.make(EchoRpcs).pipe(Effect.provideContext(protocol));
});

type EchoClient = Effect.Success<ReturnType<typeof makeEchoClient>>;

/** Connects a tab to a fresh plugin worker whose only module is the echo module, loaded by URL. */
const connect = async (org: string): Promise<EchoClient> => {
  const scope = Effect.runSync(Scope.make());
  const client = new Trigger<EchoClient>();
  const connection = new Client.Connection({
    createWorker: () => new Worker(new URL('./testing/test-worker.ts', import.meta.url), { type: 'module' }),
    createCoordinator: () =>
      new Coordinator.SharedWorker({
        createWorker: () =>
          new SharedWorker(new URL('./testing/coordinator-worker.ts', import.meta.url), {
            type: 'module',
            name: 'app-framework-plugin-worker-test',
          }),
      }),
    leaderLockKey: 'app-framework/test/plugin-worker-leader',
    config: { runtime: { app: { org }, client: { workerModules: [echoModule] } } },
    onConnect: async ({ clientToWorker, workerToClient }) => {
      const sessionScope = await EffectEx.runPromise(Scope.fork(scope));
      // Served before the client opens: the worker's session waits on its reverse-channel handshake.
      await EffectEx.runPromise(
        Layer.build(
          RpcServer.layer(TabRpcs).pipe(
            Layer.provide(TabRpcs.toLayer({})),
            Layer.provide(RpcServer.layerProtocolWorkerRunner),
            Layer.provide(BrowserWorkerRunner.layerMessagePort(workerToClient)),
          ),
        ).pipe(Scope.provide(sessionScope)),
      );
      client.wake(await EffectEx.runPromise(makeEchoClient(clientToWorker).pipe(Scope.provide(sessionScope))));
      return { close: () => EffectEx.runPromise(Scope.close(sessionScope, Exit.void)) };
    },
  });
  onTestFinished(async () => {
    await connection.close();
    await EffectEx.runPromise(Scope.close(scope, Exit.void));
  });
  await connection.open();
  return client.wait();
};

describe('PluginWorker', () => {
  // The worker boots a plugin manager and imports the module's body over the dev server.
  test('serves the RPCs a module loaded by URL registers on the router', { timeout: 20_000 }, async () => {
    const echo = await connect('test-org');
    // The config the tab sent reaches the module's layer through the base's ConfigService.
    expect(await EffectEx.runPromise(echo['echo.echo']({ text: 'hello' }))).toBe('test-org:hello');
    // The module counted this session off the base's SessionOpened hook.
    expect(await EffectEx.runPromise(echo['echo.sessions']())).toBe(1);
  });
});
