//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { add } from './add.ts';
import { query } from './query/index.ts';
import { remove } from './remove.ts';
import { stats } from './stats.ts';

// TODO(wittjosiah): Alias to `db`.
export const database: Command.Command<any, any, any, any, any> = Command.make('database').pipe(
  Command.withDescription('Database access.'),
  Command.withSubcommands([add, query, remove, stats]),
);
