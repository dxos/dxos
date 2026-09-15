//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { list } from './list/index.ts';

export const user = Command.make('user').pipe(
  Command.withDescription('Manage Hub users.'),
  Command.withSubcommands([list]),
);
