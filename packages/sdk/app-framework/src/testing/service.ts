//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { invariant } from '@dxos/invariant';

import { ActivationEvents, Capabilities } from '../common';
import { Plugin, PluginManager } from '../core';

/**
 * Creates a Plugin.Service layer from a list of plugins.
 * This is primarily used for testing.
 */
export const fromPlugins = (plugins: Plugin.Plugin[]) =>
  Layer.effect(
    Plugin.Service,
    Effect.gen(function* () {
      // TODO(wittjosiah): Try to dedupe logic between here, createCliApp and useApp.

      const pluginLoader = (id: string) =>
        Effect.sync(() => {
          const plugin = plugins.find((plugin) => plugin.meta.id === id);
          invariant(plugin, `Plugin not found: ${id}`);
          return plugin;
        });

      const manager = PluginManager.make({
        pluginLoader,
        plugins,
        core: plugins.map((plugin) => plugin.meta.id),
      });

      manager.capabilities.contribute({
        interface: Capabilities.PluginManager,
        implementation: manager,
        module: 'dxos.org/app-framework/plugin-manager',
      });

      manager.capabilities.contribute({
        interface: Capabilities.AtomRegistry,
        implementation: manager.registry,
        module: 'dxos.org/app-framework/atom-registry',
      });

      yield* manager.activate(ActivationEvents.Startup);

      return manager;
    }),
  );
