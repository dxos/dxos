//
// Copyright 2025 DXOS.org
//

// @vitest-environment node

import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import { describe, onTestFinished, test } from 'vitest';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { ActivationEvents, Capabilities, type Plugin } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { create } from '@dxos/protocols/buf';
import { RuntimeSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { Config } from '@dxos/react-client';

const localConfig = new Config({
  runtime: create(RuntimeSchema, {
    services: SERVICES_CONFIG.LOCAL,
  }),
});

/**
 * Measures the time taken for each phase of ClientPlugin startup.
 * Uses dynamic imports to lazy-load plugins, mirroring the lazy loading pattern used in stories.
 */
describe('ClientPlugin startup', () => {
  test('measure startup time with lazy imports', async ({ expect }) => {
    const timings: Record<string, number> = {};
    const mark = (label: string, startTime: number) => {
      const elapsed = performance.now() - startTime;
      timings[label] = elapsed;
      log.info('timing', { label, elapsed: `${elapsed.toFixed(0)}ms` });
    };

    const totalStart = performance.now();

    // Phase 1: Lazy-load plugins.
    let phaseStart = performance.now();
    const [{ OperationPlugin, PluginManager, RuntimePlugin }, { ClientCapabilities, ClientPlugin }, { GraphPlugin }] =
      await Promise.all([import('@dxos/app-framework'), import('@dxos/plugin-client'), import('@dxos/plugin-graph')]);
    mark('dynamic imports', phaseStart);

    // Phase 2: Create PluginManager with core plugins + ClientPlugin.
    phaseStart = performance.now();

    const clientPlugin = ClientPlugin({
      config: localConfig,
      onClientInitialized: ({ client }) =>
        Effect.gen(function* () {
          const cbStart = performance.now();
          log.info('onClientInitialized start', { identity: client.halo.identity.get()?.did });

          if (client.halo.identity.get()) {
            mark('onClientInitialized (already initialized)', cbStart);
            return;
          }

          const identityStart = performance.now();
          yield* Effect.promise(() => client.halo.createIdentity());
          mark('createIdentity', identityStart);

          const spacesStart = performance.now();
          yield* Effect.promise(() => client.spaces.waitUntilReady());
          mark('spaces.waitUntilReady', spacesStart);

          const spaceStart = performance.now();
          const space = client.spaces.default;
          yield* Effect.promise(() => space.waitUntilReady());
          mark('space.waitUntilReady', spaceStart);

          const flush1Start = performance.now();
          yield* Effect.promise(() => space.db.flush({ indexes: true }));
          mark('db.flush (first)', flush1Start);

          const flush2Start = performance.now();
          yield* Effect.promise(() => space.db.flush({ indexes: true }));
          mark('db.flush (second)', flush2Start);

          mark('onClientInitialized (total)', cbStart);
        }),
    });

    // Minimal set of framework plugins needed for ClientPlugin to activate.
    const plugins: Plugin.Plugin[] = [GraphPlugin(), OperationPlugin(), RuntimePlugin(), clientPlugin];

    const pluginLoader = Effect.fn(function* (id: string) {
      const plugin = plugins.find((plugin) => plugin.meta.id === id);
      invariant(plugin, `Plugin not found: ${id}`);
      return plugin;
    });

    const manager = PluginManager.make({
      pluginLoader,
      plugins,
      core: plugins.map(({ meta }) => meta.id),
    });
    mark('PluginManager.make', phaseStart);

    // Contribute capabilities that useApp normally provides.
    manager.capabilities.contribute({
      interface: Capabilities.PluginManager,
      implementation: manager,
      module: 'test',
    });
    manager.capabilities.contribute({
      interface: Capabilities.AtomRegistry,
      implementation: manager.registry,
      module: 'test',
    });

    // Track activation event timing.
    const eventTimings: Record<string, number> = {};
    const eventStarts: Record<string, number> = {};
    const startupDone = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Startup timed out after 30s')), 30_000);
      PubSub.subscribe(manager.activation).pipe(
        Effect.flatMap((queue) =>
          Queue.take(queue).pipe(
            Effect.tap(({ event, state, error: activationError }) =>
              Effect.sync(() => {
                if (state === 'activating') {
                  eventStarts[event] = performance.now();
                } else if (state === 'activated') {
                  if (eventStarts[event]) {
                    eventTimings[event] = performance.now() - eventStarts[event];
                  }
                  log.info('activated', { event, elapsed: `${eventTimings[event]?.toFixed(0)}ms` });
                  if (event === ActivationEvents.Startup.id) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } else if (state === 'error') {
                  log.error('activation error', { event, error: activationError });
                  clearTimeout(timeout);
                  reject(activationError);
                }
              }),
            ),
            Effect.forever,
          ),
        ),
        Effect.scoped,
        Effect.runFork,
      );
    });

    // Phase 3: Fire activation events (mirrors useApp behavior).
    phaseStart = performance.now();
    await Effect.all([
      manager.activate(ActivationEvents.SetupReactSurface),
      manager.activate(ActivationEvents.Startup),
    ]).pipe(Effect.runPromise);
    mark('activation (core events)', phaseStart);

    await startupDone;
    mark('total startup', totalStart);

    // Verify client is ready.
    const client = manager.capabilities.get(ClientCapabilities.Client);
    expect(client).toBeDefined();
    expect(client.halo.identity.get()).toBeDefined();

    // Print summary.
    log.info('=== Startup Timing Summary ===');
    for (const [label, elapsed] of Object.entries(timings)) {
      log.info(`  ${label}: ${elapsed.toFixed(0)}ms`);
    }
    log.info('=== Event Timings ===');
    for (const [event, elapsed] of Object.entries(eventTimings)) {
      log.info(`  ${event}: ${elapsed.toFixed(0)}ms`);
    }

    // Cleanup.
    onTestFinished(async () => {
      await client.destroy();
    });
  }, 60_000);
});
