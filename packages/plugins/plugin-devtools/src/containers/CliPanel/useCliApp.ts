//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { useEffect, useMemo } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { useCapabilities, usePluginManager } from '@dxos/app-framework/ui';
import { CommandConfig, type CommandServices } from '@dxos/cli-util';
import { type Client, ClientService, ConfigService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';

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
 * Mounting is the demand signal: command modules are gated on `CommandsRequested`, which nothing
 * else in the app fires, so a plugin's commands stay off the critical path until a terminal opens.
 * The capability is read through its atom, so commands appear as they activate and enabling or
 * disabling a plugin later rebuilds the tree rather than leaving the terminal on the set that
 * existed when it mounted.
 *
 * The root mirrors the binary's, minus the options that only mean something on a filesystem
 * (`--config`, `--profile`); everything else resolves the same way, including `--space-id`
 * defaulting to the first available space.
 *
 * Returns `undefined` until something contributes commands — there is no shell to offer yet.
 */
export const useCliApp = (client: Client) => {
  const manager = usePluginManager();
  const commands = useCapabilities(Capabilities.Command);
  const contributed = useCapabilities(Capabilities.Layer);

  useEffect(() => {
    EffectEx.runDetached(manager.activate(ActivationEvents.CommandsRequested));
  }, [manager]);

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

    // Annotated so a service this host owes is a build error naming it, rather than a
    // "Service not found" the first time someone runs the command that needed it.
    const hostLayer: Layer.Layer<CommandServices, never, never> = Layer.mergeAll(
      ClientService.fromClient(client),
      ConfigService.fromConfig(client.config),
      Layer.succeed(Plugin.Service, manager),
      Layer.succeed(Capability.Service, manager.capabilities),
      operationLayer,
    );

    // Plugins carry anything further their own commands need.
    const layer = Layer.mergeAll(hostLayer, ...contributed);

    return { command, layer };
  }, [client, manager, commands, contributed]);
};
