//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';

import { user } from './user';

export const hub = Command.make('hub', {
  profile: Options.text('apikey').pipe(
    //
    Options.withDescription('Hub API key.'),
    Options.withDefault(process.env['DX_API_KEY']),
  ),
}).pipe(
  //
  Command.withDescription('Manage Hub.'),
  Command.withSubcommands([user]),
);
