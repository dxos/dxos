//
// Copyright 2025 DXOS.org
//

import * as Config from 'effect/Config';
import * as Layer from 'effect/Layer';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig } from '@dxos/cli-util';
import { DEFAULT_PROFILE, DXEnv } from '@dxos/client-protocol';

export const dx = Command.make('dx', {
  config: Options.file('config', { exists: 'yes' }).pipe(
    Options.withDescription('Config file path.'),
    Options.withAlias('c'),
    Options.optional,
  ),
  // TODO(burdon): CommandConfig layer should throw if profile doesn't exist.
  profile: Options.string('profile').pipe(
    Options.withDescription('Profile for the config file.'),
    Options.withAlias('p'),
    Options.withFallbackConfig(Config.string(DXEnv.PROFILE).pipe(Config.withDefault(DEFAULT_PROFILE))),
    Options.withDefault(DXEnv.get(DXEnv.PROFILE, DEFAULT_PROFILE)),
  ),
  json: Options.boolean('json').pipe(
    Options.withDescription('JSON output.'),
    Options.withFallbackConfig(Config.boolean('JSON').pipe(Config.withDefault(false))),
  ),
  verbose: Options.boolean('verbose').pipe(
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
  Command.provide(({ json, verbose, profile, logLevel }) =>
    Layer.succeed(CommandConfig, {
      json,
      verbose,
      profile,
      logLevel,
    }),
  ),
);
