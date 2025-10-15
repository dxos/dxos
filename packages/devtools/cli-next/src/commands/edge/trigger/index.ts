//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { list } from './list';
import { remove } from './remove';
import { timer } from './timer';

export const trigger = Command.make('trigger').pipe(
  Command.withDescription('Manage EDGE triggers.'),
  Command.withSubcommands([list, remove, timer]),
);
