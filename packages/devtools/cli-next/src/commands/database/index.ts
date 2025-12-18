//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { query } from './query';
import { remove } from './remove';
import { stats } from './stats';

// TODO(wittjosiah): Alias to `db`.
export const database = Command.make('database').pipe(
  Command.withDescription('Database access.'),
  Command.withSubcommands([query, stats, remove]),
);
