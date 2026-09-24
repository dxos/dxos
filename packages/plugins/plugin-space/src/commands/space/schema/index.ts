//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { list } from './list/index.ts';

export const schema = Command.make('schema').pipe(
  Command.withDescription('Manage space schemas.'),
  Command.withSubcommands([list]),
);
