//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability, Plugin, type PluginManager } from '@dxos/app-framework';
import { CommandConfig } from '@dxos/cli-util';
import { type Client, ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { database, queue, space } from '@dxos/plugin-space/commands';

const OPERATIONS_UNAVAILABLE = 'Operations are not available in the devtools terminal.';

/**
 * Commands that create objects invoke operations, which this surface has no runtime for. Failing
 * with a stated reason beats the bare "Service not found" a missing layer would produce.
 */
const operationLayer = Layer.succeed(Operation.Service, {
  invoke: () => Effect.die(OPERATIONS_UNAVAILABLE),
  schedule: () => Effect.die(OPERATIONS_UNAVAILABLE),
  invokePromise: async () => ({ error: new Error(OPERATIONS_UNAVAILABLE) }),
});

/**
 * Builds the `dx` command tree and the services its handlers need.
 *
 * Mirrors the binary's root command minus the options that only mean something on a filesystem
 * (`--config`, `--profile`); everything else resolves the same way, including `--space-id`
 * defaulting to the first available space.
 */
export const createCliApp = (client: Client, manager: PluginManager.PluginManager) => {
  // `provide` comes after the subcommands so the config reaches them in the type as well as at
  // runtime; applied before, every subcommand still advertises `CommandConfig` as unmet.
  const command = Command.make('dx', {
    json: Options.boolean('json', { ifPresent: true }).pipe(Options.withDescription('JSON output.')),
    verbose: Options.boolean('verbose', { ifPresent: true }).pipe(
      Options.withAlias('v'),
      Options.withDescription('Verbose output.'),
    ),
  }).pipe(
    Command.withSubcommands([space, database, queue]),
    Command.provide(({ json, verbose }) =>
      Layer.succeed(CommandConfig, { json, verbose, profile: 'default', logLevel: 'info' }),
    ),
  );

  const layer = Layer.mergeAll(
    ClientService.fromClient(client),
    Layer.succeed(Plugin.Service, manager),
    Layer.succeed(Capability.Service, manager.capabilities),
    operationLayer,
  );

  return { command, layer };
};
