//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';

import { ENV_DX_PROFILE_DEFAULT } from '@dxos/client-protocol';

import { ClientService, ConfigService } from '../services';

import { edge } from './edge';
import { halo } from './halo';
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
}).pipe(
  Command.withSubcommands([halo, edge, spaces]),
  // TODO(wittjosiah): Will there be commands that don't need the client? Push down to subcommands?
  Command.provide(ClientService.layer),
  Command.provideEffect(ConfigService, (args) => ConfigService.load(args)),
);
