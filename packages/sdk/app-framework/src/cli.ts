//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { invariant } from '@dxos/invariant';

import { Capabilities, Events } from './common';
import { type Plugin, PluginManager, type PluginManagerOptions, PluginService } from './core';

const defaultPluginLoader =
  (plugins: Plugin[]): PluginManagerOptions['pluginLoader'] =>
  (id: string) => {
    const plugin = plugins.find((plugin) => plugin.meta.id === id);
    invariant(plugin, `Plugin not found: ${id}`);
    return plugin;
  };

type SubCommands = [Command.Command<any, any, any, any>, ...Array<Command.Command<any, any, any, any>>];

export type CreateCliAppOptions = {
  rootCommand: Command.Command<any, any, any, any>;
  subCommands?: SubCommands;
  pluginManager?: PluginManager;
  pluginLoader?: PluginManagerOptions['pluginLoader'];
  plugins?: Plugin[];
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
 * const commands = manager.context.getCapabilities(Capabilities.Command);
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
  subCommands: subCommandsProp,
  pluginManager: pluginManagerProp,
  pluginLoader: pluginLoaderProp,
  plugins: pluginsProp = [],
  core: coreProp,
  enabled: enabledProp = [],
  safeMode = false,
}: CreateCliAppOptions) {
  const plugins = pluginsProp;
  const core = coreProp ?? plugins.map(({ meta }) => meta.id);
  const pluginLoader = pluginLoaderProp ?? defaultPluginLoader(plugins);
  const enabled = safeMode ? [] : enabledProp;
  const manager =
    pluginManagerProp ??
    new PluginManager({
      pluginLoader,
      plugins,
      core,
      enabled,
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

  // Gather all layers and merge them into a single layer.
  const layers = manager.context.getCapabilities(Capabilities.Layer);
  const layer = Layer.mergeAll(PluginService.fromManager(manager), ...layers);

  // Gather all commands and provide them to the root command.
  const pluginCommands = manager.context.getCapabilities(Capabilities.Command);
  const subCommands = subCommandsProp ? [...subCommandsProp, ...pluginCommands] : pluginCommands;
  invariant(subCommands.length > 0, 'No subcommands provided');
  const command = rootCommand.pipe(Command.withSubcommands(subCommands as SubCommands));

  return { command, layer };
});
