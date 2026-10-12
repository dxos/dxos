//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { type ExpectStatic, describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Config } from '@dxos/client';
import { RemoteProcessManager } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { DXN } from '@dxos/keys';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import { RoutinePlugin } from '#plugin';

/** A port fetch refuses outright, so the client's own EDGE probes fail locally and the tests need no network. */
const EDGE_URL = 'http://127.0.0.1:1';

const Echo = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.echo'), name: 'Echo' },
  input: Schema.String,
  output: Schema.String,
});

/** Contributes a trivial local operation, so the app's invoker has something to spawn. */
const EchoPlugin = Plugin.define({ profile: { key: 'com.example.plugin.echo', name: 'Echo (test)' } }).pipe(
  Plugin.addModule(
    Capability.inlineModule('operation-handler', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(Echo, (input) => Effect.succeed(input))),
        ),
      ]),
    ),
  ),
  Plugin.make,
);

const createApp = (config?: Config) =>
  Harness.createComposerTestApp({
    plugins: [ClientPlugin.make(config ? { config } : {}), RoutinePlugin(), EchoPlugin()],
  });

type App = Awaited<ReturnType<typeof createApp>>;

/** Resolves a service from the stack in the application context, as an application-affinity consumer does. */
const resolve = <Tag extends Context.Key<any, any>>(harness: App, tag: Tag) =>
  harness.runPromise(Effect.scoped(ServiceResolver.resolve(tag, {})));

/** Pids of the process tree, in order. */
const pids = (tree: readonly Process.Process[]) => tree.map(({ pid }) => pid);

/**
 * Asserts the app's `Capabilities.ProcessManager` is the stack's `Process.ManagerService`: a local spawn through the
 * app's invoker lands in both trees, and a process the stack's remote manager reports reaches the app's tree.
 */
const expectOneManager = async (
  expect: ExpectStatic,
  harness: App,
  stackManager: Process.Manager,
  remote: RemoteProcessManager.Manager,
) => {
  const appManager = harness.get(Capabilities.ProcessManager);

  expect(await harness.invoke(Echo, 'hello')).toBe('hello');
  const localTree = await harness.runPromise(stackManager.processTree);
  const echo = localTree.find(({ key }) => key === DXN.getName(Echo.meta.key));
  expect(echo).toBeDefined();
  expect(pids(await harness.runPromise(appManager.processTree))).toEqual(pids(localTree));

  // Stands in for EDGE publishing a process it runs, which is how its half of the tree fills in.
  harness.registry.set(remote.processTreeAtom, localTree);
  const appTree = await harness.runPromise(appManager.processTree);
  expect(pids(appTree)).toEqual([...pids(localTree), ...pids(localTree)]);
  expect(pids(harness.registry.get(appManager.processTreeAtom))).toEqual(pids(appTree));
};

describe('process manager in the Composer app', () => {
  test('builds one manager over the no-op remote without an edge url', async ({ expect }) => {
    await using harness = await createApp();

    const stackManager = await resolve(harness, Process.ManagerService);
    const remote = await resolve(harness, RemoteProcessManager.Service);
    expect(remote.spawn).toBeUndefined();
    expect(remote.list).toBeUndefined();

    await expectOneManager(expect, harness, stackManager, remote);
  });

  test('builds one manager over EDGE when the client config names an edge url', async ({ expect }) => {
    await using harness = await createApp(new Config({ runtime: { services: { edge: { url: EDGE_URL } } } }));

    const stackManager = await resolve(harness, Process.ManagerService);
    const remote = await resolve(harness, RemoteProcessManager.Service);
    // Presence only: EDGE control is deferred until first use, which would need a reachable EDGE.
    expect(remote.spawn).toBeDefined();
    expect(remote.list).toBeDefined();

    await expectOneManager(expect, harness, stackManager, remote);
  });
});
