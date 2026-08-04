//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability, Plugin, type PluginManager } from '@dxos/app-framework';
import { CommandConfig } from '@dxos/cli-util';
import { type Client, ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';

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
 * Subcommands come from whatever plugins contributed them, the same way the binary collects them,
 * so the terminal exposes the commands of the running app rather than a hardcoded set.
 *
 * The root mirrors the binary's minus the options that only mean something on a filesystem
 * (`--config`, `--profile`); everything else resolves the same way, including `--space-id`
 * defaulting to the first available space.
 */
export const createCliApp = (client: Client, manager: PluginManager.PluginManager) => {
  // Destructured rather than passed as an array so the non-empty shape `withSubcommands` requires
  // is carried by the type instead of asserted. A host whose plugins contribute nothing has no
  // shell to offer, so the caller renders an empty state instead.
  const [first, ...rest] = manager.capabilities.getAll(Capabilities.Command);
  if (!first) {
    return undefined;
  }

  // `provide` comes after the subcommands so the config reaches them in the type as well as at
  // runtime; applied before, every subcommand still advertises `CommandConfig` as unmet.
  const command = Command.make('dx', {
    json: Options.boolean('json', { ifPresent: true }).pipe(Options.withDescription('JSON output.')),
    verbose: Options.boolean('verbose', { ifPresent: true }).pipe(
      Options.withAlias('v'),
      Options.withDescription('Verbose output.'),
    ),
  }).pipe(
    Command.withSubcommands([first, ...rest]),
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
