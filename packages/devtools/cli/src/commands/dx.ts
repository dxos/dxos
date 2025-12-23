//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { createCliApp } from '@dxos/app-framework';
import { CommandConfig } from '@dxos/cli-util';
import { ClientService, ConfigService } from '@dxos/client';
import { DEFAULT_PROFILE, DXEnv } from '@dxos/client-protocol';

import { DXOS_VERSION } from '../version';

import { chat } from './chat';
import { debug } from './debug';
import { fn } from './function';
import { hub } from './hub';
import { getCore, getDefaults, getPlugins } from './plugin-defs';
import { repl } from './repl';

export const command = Command.make('dx', {
  config: Options.file('config', { exists: 'yes' }).pipe(
    Options.withDescription('Config file path.'),
    Options.withAlias('c'),
    Options.optional,
  ),
  // TODO(burdon): CommandConfig layer should throw if profile doesn't exist.
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
}).pipe(
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

export const run = Effect.fn(function* (args: readonly string[]) {
  const dx = yield* createCliApp({
    rootCommand: command,
    subCommands: [
      repl,

      // TODO(wittjosiah): Factor out.
      //   Currently would require standalone plugins due to clash between solid & react compilation.
      //   Either create cli-specific plugins for these or wait until assistant/script plugins are built w/ Solid.
      chat.pipe(Command.provide(ClientService.layer)),
      fn.pipe(Command.provide(ClientService.layer)),

      // TODO(burdon): Admin-only. Where should these commands live?
      debug.pipe(Command.provide(ClientService.layer)),
      hub.pipe(Command.provide(ClientService.layer)),
    ],
    plugins: getPlugins(),
    core: getCore(),
    defaults: getDefaults(),
  });

  return yield* Command.run(dx, {
    name: 'DXOS CLI',
    version: DXOS_VERSION,
  })(args);
});
