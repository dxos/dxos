//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { add } from './add';
import { list } from './list';

export const credential = Command.make('credential').pipe(
  Command.withDescription('Manage HALO credentials.'),
  Command.withSubcommands([add, list]),
);

