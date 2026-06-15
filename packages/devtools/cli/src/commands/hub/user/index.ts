//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { list } from './list';

export const user = Command.make('user').pipe(
  Command.withDescription('Manage Hub users.'),
  Command.withSubcommands([list]),
);
