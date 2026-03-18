//
// Copyright 2025 DXOS.org
//

import { assert, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities } from '../../common';
import { Capability, Plugin, PluginManager } from '../../core';

const String = Capability.make<{ string: string }>('org.dxos.test.string');
const testMeta = { id: 'org.dxos.plugin.test', name: 'Test' };

const pluginLoader = (plugins: Plugin.Plugin[]) =>
  Effect.fn(function* (id: string) {
    const plugin = plugins.find((plugin) => plugin.meta.id === id);
    if (!plugin) {
      return yield* Effect.fail(new Error(`Plugin not found: ${id}`));
    }
    return plugin;
  });

describe('useApp cleanup integration', () => {
  it.effect('shutdown deactivates modules and clears bookkeeping', () =>
    Effect.gen(function* () {
      const plugin = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      )();

      const manager = PluginManager.make({
        pluginLoader: pluginLoader([plugin]),
        plugins: [plugin],
      });

      manager.capabilities.contribute({
        interface: Capabilities.PluginManager,
        implementation: manager,
        module: 'org.dxos.app-framework.plugin-manager',
      });
      manager.capabilities.contribute({
        interface: Capabilities.AtomRegistry,
        implementation: manager.registry,
        module: 'org.dxos.app-framework.atom-registry',
      });
      yield* manager.activate(ActivationEvents.Startup);

      assert.strictEqual(manager.capabilities.getAll(String).length, 1);
      assert.isTrue(manager.getActive().length > 0);

      yield* manager.shutdown();

      assert.strictEqual(manager.capabilities.getAll(String).length, 0);
      assert.deepStrictEqual(manager.getActive(), []);
      assert.deepStrictEqual(manager.getEventsFired(), []);
    }),
  );

  it.effect('external manager is not shut down when useApp does not own it', () =>
    Effect.gen(function* () {
      const plugin = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      )();

      const manager = PluginManager.make({
        pluginLoader: pluginLoader([plugin]),
        plugins: [plugin],
      });

      // External manager contributes its own root capabilities.
      manager.capabilities.contribute({
        interface: Capabilities.PluginManager,
        implementation: manager,
        module: 'org.dxos.app-framework.plugin-manager',
      });
      manager.capabilities.contribute({
        interface: Capabilities.AtomRegistry,
        implementation: manager.registry,
        module: 'org.dxos.app-framework.atom-registry',
      });
      yield* manager.activate(ActivationEvents.Startup);

      // Simulate useApp cleanup for externally-owned manager:
      // shutdown is NOT called, only the fiber is interrupted.
      // The external owner is responsible for shutdown.
      assert.strictEqual(manager.capabilities.getAll(Capabilities.PluginManager).length, 1);
      assert.strictEqual(manager.capabilities.getAll(Capabilities.AtomRegistry).length, 1);
      assert.strictEqual(manager.capabilities.getAll(String).length, 1);
      assert.isTrue(manager.getActive().length > 0);

      // External owner eventually calls shutdown.
      yield* manager.shutdown();

      assert.strictEqual(manager.capabilities.getAll(String).length, 0);
      assert.deepStrictEqual(manager.getActive(), []);
    }),
  );

  it.effect('shutdown is idempotent when called multiple times', () =>
    Effect.gen(function* () {
      const plugin = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      )();

      const manager = PluginManager.make({
        pluginLoader: pluginLoader([plugin]),
        plugins: [plugin],
      });

      manager.capabilities.contribute({
        interface: Capabilities.PluginManager,
        implementation: manager,
        module: 'org.dxos.app-framework.plugin-manager',
      });
      yield* manager.activate(ActivationEvents.Startup);

      yield* manager.shutdown();
      assert.deepStrictEqual(manager.getActive(), []);

      // Second shutdown should succeed without error.
      const result = yield* manager.shutdown();
      assert.isTrue(result);
      assert.deepStrictEqual(manager.getActive(), []);
    }),
  );
});
