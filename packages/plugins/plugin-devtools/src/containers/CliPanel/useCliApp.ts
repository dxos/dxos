//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { useCapabilities, usePluginManager } from '@dxos/app-framework/ui';
import { CommandConfig } from '@dxos/cli-util';
import { type Client, ClientService, ConfigService } from '@dxos/client';
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
 * Subcommands are read through the capability atom, so enabling or disabling a plugin rebuilds the
 * tree rather than leaving the terminal on whichever set existed when it mounted.
 *
 * The root mirrors the binary's, minus the options that only mean something on a filesystem
 * (`--config`, `--profile`); everything else resolves the same way, including `--space-id`
 * defaulting to the first available space.
 *
 * Returns `undefined` when nothing contributes commands — there is no shell to offer.
 */
export const useCliApp = (client: Client) => {
  const manager = usePluginManager();
  const commands = useCapabilities(Capabilities.Command);
  const contributed = useCapabilities(Capabilities.Layer);

  return useMemo(() => {
    // Destructured rather than passed as an array so the non-empty shape `withSubcommands` requires
    // is carried by the type instead of asserted.
    const [first, ...rest] = commands;
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

    // Plugins carry the services their own commands need, so take their layers rather than
    // hand-listing services here and finding out at runtime which one is missing.
    const layer = Layer.mergeAll(
      ClientService.fromClient(client),
      ConfigService.fromConfig(client.config),
      Layer.succeed(Plugin.Service, manager),
      Layer.succeed(Capability.Service, manager.capabilities),
      operationLayer,
      ...contributed,
    );

    return { command, layer };
  }, [client, manager, commands, contributed]);
};
