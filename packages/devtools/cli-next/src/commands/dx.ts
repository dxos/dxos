//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Config from 'effect/Config';
import * as Layer from 'effect/Layer';

import { ClientService, ConfigService } from '@dxos/client';
import { DEFAULT_PROFILE, DXEnv } from '@dxos/client-protocol';

import { CommandConfig } from '../services';
import { DXOS_VERSION } from '../version';

import { chat } from './chat';
import { config } from './config';
import { debug } from './debug';
import { edge } from './edge';
import { fn } from './function';
import { halo } from './halo';
import { hub } from './hub';
import { object } from './object';
import { profile } from './profile';
import { queue } from './queue';
import { repl } from './repl';
import { space } from './space';
import { trigger } from './trigger';

export const command = Command.make('dx', {
  config: Options.file('config', { exists: 'yes' }).pipe(
    Options.withDescription('Config file path.'),
    Options.withAlias('c'),
    Options.optional,
  ),
  // TODO(burdon): Throw if profile doesn't exist.
  profile: Options.text('profile').pipe(
    Options.withDescription('Profile for the config file.'),
    Options.withAlias('p'),
    Options.withFallbackConfig(Config.string(DXEnv.PROFILE).pipe(Config.withDefault(DEFAULT_PROFILE))),
    Options.withDefault(DXEnv.get(DXEnv.PROFILE, DEFAULT_PROFILE)),
  ),
  json: Options.boolean('json', { ifPresent: true }).pipe(
    Options.withDescription('JSON output.'),
    Options.withFallbackConfig(Config.boolean('JSON').pipe(Config.withDefault(false))),
  ),
  verbose: Options.boolean('verbose', { ifPresent: true }).pipe(
    Options.withDescription('Verbose logging.'),
    Options.withAlias('v'),
    Options.withFallbackConfig(Config.boolean('VERBOSE').pipe(Config.withDefault(false))),
  ),
  logLevel: Options.choice('logLevel', ['debug', 'verbose', 'info', 'warn', 'error']).pipe(
    Options.withDescription('Log level to use.'),
    Options.withAlias('l'),
    Options.withDefault(DXEnv.get(DXEnv.DEBUG, 'info')),
  ),
  timeout: Options.integer('timeout').pipe(
    Options.withDescription('The timeout before the command fails.'),
    Options.optional,
  ),
});

/**
 * Root command.
 */
export const dx = command.pipe(
  Command.withSubcommands([
    config,
    profile,
    repl,

    // Only providing client to commands that require it.
    chat.pipe(Command.provide(ClientService.layer)),
    edge.pipe(Command.provide(ClientService.layer)),
    fn.pipe(Command.provide(ClientService.layer)),
    halo.pipe(Command.provide(ClientService.layer)),
    object.pipe(Command.provide(ClientService.layer)),
    queue.pipe(Command.provide(ClientService.layer)),
    space.pipe(Command.provide(ClientService.layer)),
    trigger.pipe(Command.provide(ClientService.layer)),

    // TODO(burdon): Admin-only (separate dynamic module?)
    debug.pipe(Command.provide(ClientService.layer)),
    hub.pipe(Command.provide(ClientService.layer)),
  ]),
  // TODO(wittjosiah): Create separate command path for clients that don't need the client.
  Command.provideEffect(ConfigService, (args) => ConfigService.load(args)),
  Command.provide(({ json, verbose, profile, logLevel }) =>
    Layer.succeed(CommandConfig, {
      json,
      verbose,
      profile,
      logLevel,
    }),
  ),
);

// TODO(wittjosiah): `repl` causes this to lose a bunch of type information due to the cycle.
export const run = Command.run(dx, {
  name: 'DXOS CLI',
  version: DXOS_VERSION,
});
