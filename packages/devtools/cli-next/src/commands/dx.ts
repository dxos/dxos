//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';

import { ENV_DX_PROFILE_DEFAULT } from '@dxos/client-protocol';

import { ClientService, ConfigService } from '../services';

import { edge } from './edge';
import { halo } from './halo';
import { hub } from './hub';
import { spaces } from './spaces';

// TODO(wittjosiah): Env vars.

export const dx = Command.make('dx', {
  config: Options.file('config', { exists: 'yes' }).pipe(
    //
    Options.withDescription('Config file path.'),
    Options.withAlias('c'),
    Options.optional,
  ),
  profile: Options.text('profile').pipe(
    //
    Options.withDescription('Profile for the config file.'),
    Options.withDefault(ENV_DX_PROFILE_DEFAULT),
    Options.withAlias('p'),
  ),
  verbose: Options.boolean('verbose').pipe(
    //
    Options.withDescription('Verbose logging.'),
  ),
}).pipe(
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
);
