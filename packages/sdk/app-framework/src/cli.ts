//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { invariant } from '@dxos/invariant';

import * as Common from './common';
import { type Plugin, PluginManager } from './core';

const defaultPluginLoader =
  (plugins: Plugin.Plugin[]): PluginManager.ManagerOptions['pluginLoader'] =>
  (id: string) =>
    Effect.sync(() => {
      const plugin = plugins.find((plugin) => plugin.meta.id === id);
      invariant(plugin, `Plugin not found: ${id}`);
      return plugin;
    });

type SubCommands = [Command.Command<any, any, any, any>, ...Array<Command.Command<any, any, any, any>>];

export type CreateCliAppOptions = {
  rootCommand: Command.Command<any, any, any, any>;
  subCommands?: SubCommands;
  pluginManager?: PluginManager.PluginManager;
  pluginLoader?: PluginManager.ManagerOptions['pluginLoader'];
  plugins?: Plugin.Plugin[];
  core?: string[];
  enabled?: string[];
  safeMode?: boolean;
};

/**
 * Creates a CLI application with plugin support.
 * Similar to useApp but for CLI environments.
 *
 * @example
 * const plugins = [ClientPluginCLI()];
 * const manager = await createCliApp({ plugins });
 * const commands = manager.context.getCapabilities(Common.Capability.Command);
 *
 * @param options.pluginManager Optional existing PluginManager instance.
 * @param options.pluginLoader Function to load plugins by ID.
 * @param options.plugins All plugins available to the application.
 * @param options.core Core plugins which will always be enabled.
 * @param options.enabled Enabled plugins.
 * @param options.safeMode Whether to enable safe mode, which disables optional plugins.
 */
export const createCliApp = Effect.fn(function* ({
  rootCommand,
  subCommands: subCommandsParam,
  pluginManager: pluginManagerParam,
  pluginLoader: pluginLoaderParam,
  plugins: pluginsParam = [],
  core: coreParam,
  enabled: enabledParam = [],
  safeMode = false,
}: CreateCliAppOptions) {
  const plugins = pluginsParam;
  const core = coreParam ?? plugins.map(({ meta }) => meta.id);
  const pluginLoader = pluginLoaderParam ?? defaultPluginLoader(plugins);
  const enabled = safeMode ? [] : enabledParam;
  const manager =
    pluginManagerParam ??
    PluginManager.make({
      pluginLoader,
      plugins,
      core,
      enabled,
    });

  manager.context.contributeCapability({
    interface: Common.Capability.PluginManager,
    implementation: manager,
    module: 'dxos.org/app-framework/plugin-manager',
  });

  manager.context.contributeCapability({
    interface: Common.Capability.AtomRegistry,
    implementation: manager.registry,
    module: 'dxos.org/app-framework/atom-registry',
  });

  // Activate startup event to load CLI commands and Effect layers.
  yield* manager.activate(Common.ActivationEvent.Startup);

  // Gather all layers and merge them into a single layer.
  const layers = manager.context.getCapabilities(Common.Capability.Layer);
  const layer = Layer.mergeAll(PluginManager.Service.fromManager(manager), ...layers);

  // Gather all commands and provide them to the root command.
  const pluginCommands = manager.context.getCapabilities(Common.Capability.Command);
  const subCommands = subCommandsParam ? [...subCommandsParam, ...pluginCommands] : pluginCommands;
  invariant(subCommands.length > 0, 'No subcommands provided');
  const command = rootCommand.pipe(Command.withSubcommands(subCommands as SubCommands));

  return { command, layer };
});
