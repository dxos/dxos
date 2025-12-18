//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { list } from './list';

export const schema = Command.make('schema').pipe(
  Command.withDescription('Manage space schemas.'),
  Command.withSubcommands([list]),
);
