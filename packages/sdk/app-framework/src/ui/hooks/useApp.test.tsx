//
// Copyright 2025 DXOS.org
//

import { afterEach, assert, describe, it, vi } from '@effect/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { DXN } from '@dxos/keys';

import { ActivationEvents, Capabilities } from '../../common';
import { Capability, Plugin, PluginManager } from '../../core';
import { useApp } from './useApp';

const String = Capability.makeSingleton<{ string: string }>()('org.dxos.test.string');
const testMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test'), name: 'Test', tags: ['system'] });

const pluginLoader = (plugins: Plugin.Plugin[]) =>
  Effect.fn(function* (id: string) {
    const plugin = plugins.find((plugin) => plugin.meta.profile.key === id);
    if (!plugin) {
      return yield* Effect.fail(new Error(`Plugin not found: ${id}`));
    }
    return { plugin };
  });

const TestHost = ({ manager, timeout }: { manager: PluginManager.PluginManager; timeout?: number }) => {
  const App = useApp({ pluginManager: manager, timeout, fallback: () => <div>startup failed</div> });
  return <App />;
};

const makeManager = (plugin: Plugin.Plugin) =>
  PluginManager.make({ pluginLoader: pluginLoader([plugin]), plugins: [plugin] });

describe('useApp startup watchdog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('a completed boot never times out', async () => {
    const plugin = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        id: 'Hello',
        activatesOn: ActivationEvents.Startup,
        provides: [String],
        activate: () => Effect.succeed([Capability.contribute(String, { string: 'hello' })]),
      }),
      Plugin.make,
    )();
    const manager = makeManager(plugin);
    render(<TestHost manager={manager} timeout={100} />);
    await waitFor(() => assert.isTrue(manager.getActive().length > 0));
    // The watchdog ticks once a second; wait past the first tick after the window would have closed.
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    assert.isNull(screen.queryByText('startup failed'));
  });

  it('a boot with no activation progress fails in production', async () => {
    vi.stubEnv('DEV', false);
    const plugin = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        id: 'Hello',
        activatesOn: ActivationEvents.Startup,
        provides: [String],
        activate: () => Effect.never.pipe(Effect.map(() => [Capability.contribute(String, { string: 'never' })])),
      }),
      Plugin.make,
    )();
    const manager = makeManager(plugin);
    render(<TestHost manager={manager} timeout={100} />);
    await waitFor(() => assert.isNotNull(screen.queryByText('startup failed')), { timeout: 3_000 });
  });
});

describe('useApp cleanup integration', () => {
  it.effect('external manager is not shut down when useApp does not own it', () =>
    Effect.gen(function* () {
      const plugin = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          provides: [String],
          activate: () => Effect.succeed([Capability.contribute(String, { string: 'hello' })]),
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

      const view = yield* Effect.promise(() => Promise.resolve(render(<TestHost manager={manager} />)));
      yield* Effect.promise(() =>
        waitFor(() => {
          assert.strictEqual(manager.capabilities.getAll(Capabilities.PluginManager).length, 1);
          assert.strictEqual(manager.capabilities.getAll(Capabilities.AtomRegistry).length, 1);
          assert.strictEqual(manager.capabilities.getAll(String).length, 1);
          assert.isTrue(manager.getActive().length > 0);
        }),
      );

      yield* Effect.promise(() => Promise.resolve(view.unmount()));
      yield* Effect.promise(() =>
        waitFor(() => {
          assert.strictEqual(manager.capabilities.getAll(Capabilities.PluginManager).length, 1);
          assert.strictEqual(manager.capabilities.getAll(Capabilities.AtomRegistry).length, 1);
          assert.strictEqual(manager.capabilities.getAll(String).length, 1);
          assert.isTrue(manager.getActive().length > 0);
        }),
      );

      yield* manager.shutdown();

      assert.strictEqual(manager.capabilities.getAll(Capabilities.PluginManager).length, 1);
      assert.strictEqual(manager.capabilities.getAll(Capabilities.AtomRegistry).length, 1);
      assert.strictEqual(manager.capabilities.getAll(String).length, 0);
      assert.deepStrictEqual(manager.getActive(), []);
    }),
  );

  it.effect('shutdown deactivates modules and clears bookkeeping', () =>
    Effect.gen(function* () {
      const plugin = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          provides: [String],
          activate: () => Effect.succeed([Capability.contribute(String, { string: 'hello' })]),
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

  it.effect('shutdown is idempotent when called multiple times', () =>
    Effect.gen(function* () {
      const plugin = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          provides: [String],
          activate: () => Effect.succeed([Capability.contribute(String, { string: 'hello' })]),
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
