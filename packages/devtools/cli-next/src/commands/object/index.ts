//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { query } from './query';
import { remove } from './remove';
import { stats } from './stats';

export const object = Command.make('object').pipe(
  Command.withDescription('Manage objects.'),
  Command.withSubcommands([query, remove, stats]),
);
