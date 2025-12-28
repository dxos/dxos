//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { invariant } from '@dxos/invariant';

import { Capabilities, Events } from '../common';
import { type Plugin, PluginManager } from '../core';

/**
 * Creates a PluginService layer from a list of plugins.
 * This is primarily used for testing.
 */
export const fromPlugins = (plugins: Plugin.Plugin[]) =>
  Layer.effect(
    PluginManager.Service,
    Effect.gen(function* () {
      // TODO(wittjosiah): Try to dedupe logic between here, createCliApp and useApp.

      const pluginLoader = (id: string) => {
        const plugin = plugins.find((plugin) => plugin.meta.id === id);
        invariant(plugin, `Plugin not found: ${id}`);
        return plugin;
      };

      const manager = PluginManager.make({
        pluginLoader,
        plugins,
        core: plugins.map((plugin) => plugin.meta.id),
      });

      manager.context.contributeCapability({
        interface: Capabilities.PluginManager,
        implementation: manager,
        module: 'dxos.org/app-framework/plugin-manager',
      });

      manager.context.contributeCapability({
        interface: Capabilities.AtomRegistry,
        implementation: manager.registry,
        module: 'dxos.org/app-framework/atom-registry',
      });

      yield* manager._activate(Events.Startup);

      return manager;
    }),
  );
