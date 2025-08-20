//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { ConfigProvider, Layer } from 'effect';

import { ENV_DX_PROFILE_DEFAULT } from '@dxos/client-protocol';

import { ClientService, ConfigService } from '../services';

import { edge } from './edge';
import { halo } from './halo';
import { hub } from './hub';
import { spaces } from './spaces';

// TODO(wittjosiah): Env vars.

export const command = Command.make('dx', {
  config: Options.file('config', { exists: 'yes' }).pipe(
    Options.withDescription('Config file path.'),
    Options.withAlias('c'),
    Options.optional,
  ),
  profile: Options.text('profile').pipe(
    Options.withDescription('Profile for the config file.'),
    Options.withDefault(ENV_DX_PROFILE_DEFAULT),
    Options.withAlias('p'),
  ),
  json: Options.boolean('json').pipe(Options.withDescription('JSON output.')),
  timeout: Options.integer('timeout').pipe(Options.withDescription('The timeout before the command fails.')),
  verbose: Options.boolean('verbose').pipe(Options.withDescription('Verbose logging.')),
});

export const dx = command.pipe(
  Command.withSubcommands([
    //
    halo,
    spaces,
    edge,
    // TODO(burdon): Admin-only (separate dynamic module?)
    hub,
  ]),
  // TODO(wittjosiah): Create separate command path for clients that don't need the client.
  Command.provide(ClientService.layer),
  Command.provideEffect(ConfigService, (args) => ConfigService.load(args)),
  Command.provide(({ json, verbose }) =>
    Layer.setConfigProvider(
      ConfigProvider.fromJson({ JSON: json, VERBOSE: verbose }).pipe(ConfigProvider.constantCase),
    ),
  ),
);
