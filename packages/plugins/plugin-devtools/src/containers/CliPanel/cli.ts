//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Layer from 'effect/Layer';

import { Capability, Plugin, type PluginManager } from '@dxos/app-framework';
import { CommandConfig } from '@dxos/cli-util';
import { type Client, ClientService } from '@dxos/client';
import { database, queue, space } from '@dxos/plugin-space/commands';

/**
 * Builds the `dx` command tree and the services its handlers need.
 *
 * Mirrors the binary's root command minus the options that only mean something on a filesystem
 * (`--config`, `--profile`); everything else resolves the same way, including `--space-id`
 * defaulting to the first available space.
 *
 * The plugin services are supplied because commands that create objects resolve their type from
 * the installed plugins. The command tree's requirement type erases to `any`, so nothing here is
 * checked at compile time — a missing service surfaces only when its command runs.
 */
export const createCliApp = (client: Client, manager: PluginManager.PluginManager) => {
  const command = Command.make('dx', {
    json: Options.boolean('json', { ifPresent: true }).pipe(Options.withDescription('JSON output.')),
    verbose: Options.boolean('verbose', { ifPresent: true }).pipe(
      Options.withAlias('v'),
      Options.withDescription('Verbose output.'),
    ),
  }).pipe(
    Command.provide(({ json, verbose }) =>
      Layer.succeed(CommandConfig, { json, verbose, profile: 'default', logLevel: 'info' }),
    ),
    Command.withSubcommands([space, database, queue]),
  );

  const layer = Layer.mergeAll(
    ClientService.fromClient(client),
    Layer.succeed(Plugin.Service, manager),
    Layer.succeed(Capability.Service, manager.capabilities),
  );

  return { command, layer };
};
