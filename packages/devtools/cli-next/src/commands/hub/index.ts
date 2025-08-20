//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { Common } from '../options';

import { user } from './user';

export const hub = Command.make('hub', {
  apiKey: Common.apiKey,
}).pipe(
  //
  Command.withDescription('Manage Hub.'),
  Command.withSubcommands([user]),
);
