//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import { useEffect, useMemo } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { useCapabilities, usePluginManager } from '@dxos/app-framework/ui';
import { CommandConfig, type CommandServices } from '@dxos/cli-util';
import { type Client, fromClient, fromConfig } from '@dxos/client';
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

    const command = Command.make('dx').pipe(
      // Shared so they parse anywhere in the line — a plain command config is only read when `dx`
      // itself is the leaf.
      Command.withSharedFlags({
        json: Options.boolean('json').pipe(Options.withDescription('JSON output.')),
        verbose: Options.boolean('verbose').pipe(Options.withAlias('v'), Options.withDescription('Verbose output.')),
      }),
      Command.withSubcommands([first, ...rest]),
      // After the subcommands so the config reaches them: `provide` wraps the handler it is applied
      // to, and `withSubcommands` replaces that handler with one that dispatches to the children.
      // The input widens to a union across the tree, hence the presence checks.
      Command.provide((input) =>
        Layer.succeed(CommandConfig, {
          json: 'json' in input ? input.json : false,
          verbose: 'verbose' in input ? input.verbose : false,
          profile: 'default',
          logLevel: 'info',
        }),
      ),
    );

    // Annotated so a service this host owes is a build error naming it, rather than a
    // "Service not found" the first time someone runs the command that needed it.
    const hostLayer: Layer.Layer<CommandServices, never, never> = Layer.mergeAll(
      fromClient(client),
      fromConfig(client.config),
      Layer.succeed(Plugin.Service, manager),
      Layer.succeed(Capability.Service, manager.capabilities),
      operationLayer,
    );

    // Plugins carry anything further their own commands need. A contributed layer may fail to
    // build, and the shell runs on a fiber with nowhere to report that, so it dies here instead
    // of being smuggled into the terminal as an unhandled error channel.
    const layer = Layer.orDie(Layer.mergeAll(hostLayer, ...contributed));

    return { command, layer };
  }, [client, manager, commands, contributed]);
};
