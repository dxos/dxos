//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import { invariant } from '@dxos/invariant';

import { Capabilities, Events } from './common';
import { type Plugin, PluginManager, type PluginManagerOptions } from './core';

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
  defaults?: string[];
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
 * @param options.defaults Default plugins enabled by default.
 * @param options.safeMode Whether to enable safe mode, which disables optional plugins.
 */
export const createCliApp = Effect.fn(function* ({
  rootCommand,
  subCommands: subCommandsParam,
  pluginManager: pluginManagerParam,
  pluginLoader: pluginLoaderParam,
  plugins: pluginsParam = [],
  core: coreParam,
  defaults: defaultsParam = [],
  safeMode = false,
}: CreateCliAppOptions) {
  const plugins = pluginsParam;
  const core = coreParam ?? plugins.map(({ meta }) => meta.id);
  const defaults = defaultsParam;

  // Create plugin loader if not provided
  const pluginLoader = pluginLoaderParam ?? defaultPluginLoader(plugins);

  // Create or use existing plugin manager
  const enabled = safeMode ? [] : defaults;
  const manager =
    pluginManagerParam ??
    new PluginManager({
      pluginLoader,
      plugins,
      core,
      enabled,
    });

  // Activate startup event to load CLI commands
  yield* manager._activate(Events.Startup);

  const pluginCommands = manager.context.getCapabilities(Capabilities.Command);
  const subCommands = subCommandsParam ? [...subCommandsParam, ...pluginCommands] : pluginCommands;
  invariant(subCommands.length > 0, 'No subcommands provided');
  return rootCommand.pipe(Command.withSubcommands(subCommands as SubCommands));
});
