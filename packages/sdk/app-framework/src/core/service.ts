//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { invariant } from '@dxos/invariant';

import { Capabilities, Events } from '../common';

import { PluginManager } from './manager';
import { type Plugin } from './plugin';

export class PluginService extends Context.Tag('PluginService')<PluginService, PluginManager>() {
  static fromManager = (manager: PluginManager) => Layer.succeed(PluginService, manager);

  static fromPlugins = (plugins: Plugin[]) =>
    Layer.effect(
      PluginService,
      Effect.gen(function* () {
        // TODO(wittjosiah): Try to dedupe logic between here, createCliApp and useApp.

        const pluginLoader = (id: string) => {
          const plugin = plugins.find((plugin) => plugin.meta.id === id);
          invariant(plugin, `Plugin not found: ${id}`);
          return plugin;
        };

        const manager = new PluginManager({
          pluginLoader,
          plugins: plugins,
          core: plugins.map(({ meta }) => meta.id),
          enabled: [],
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

        // Activate startup event to load CLI commands and Effect layers.
        yield* manager._activate(Events.Startup);

        return manager;
      }),
    );
}
