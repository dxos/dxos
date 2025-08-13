//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';

import { ENV_DX_PROFILE_DEFAULT } from '@dxos/client-protocol';

import { ClientService, ConfigService } from '../services';

import { fn } from './functions';
import { halo } from './halo';
import { spaces } from './spaces';

const version = '0.8.3'; // {x-release-please-version}

// TODO(wittjosiah): Env vars.

const profile = Options.text('profile').pipe(
  Options.withDescription('The profile to use for the config file'),
  Options.withDefault(ENV_DX_PROFILE_DEFAULT),
  Options.withAlias('p'),
);

const config = Options.file('config', { exists: 'yes' }).pipe(
  Options.withDescription('The path to the config file to use'),
  Options.withAlias('c'),
  Options.optional,
);

const command = Command.make('dx', { config, profile }).pipe(
  Command.withSubcommands([halo, fn, spaces]),
  // TODO(wittjosiah): Will there be commands that don't need the client? Push down to subcommands?
  Command.provide(ClientService.layer),
  Command.provideEffect(ConfigService, (args) => ConfigService.load(args)),
);

export const run = Command.run(command, { name: 'DXOS CLI', version });
