//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { add } from './add';
import { list } from './list';
import { remove } from './remove';

export const connector = Command.make('connector').pipe(
  Command.withDescription('Manage connections (OAuth / API credentials).'),
  Command.withSubcommands([add, list, remove]),
);
