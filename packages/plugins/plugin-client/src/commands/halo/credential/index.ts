//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { add } from './add/index.ts';
import { list } from './list/index.ts';

export const credential = Command.make('credential').pipe(
  Command.withDescription('Manage HALO credentials.'),
  Command.withSubcommands([add, list]),
);
