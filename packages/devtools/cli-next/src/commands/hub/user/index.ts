//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { list } from './list';

export const user = Command.make('user').pipe(
  Command.withDescription('Manage Hub users.'),
  Command.withSubcommands([list]),
);
