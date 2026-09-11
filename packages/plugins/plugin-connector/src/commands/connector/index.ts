//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { add } from './add.ts';
import { list } from './list.ts';
import { remove } from './remove.ts';

export const connector = Command.make('connector').pipe(
  Command.withDescription('Manage connections (OAuth / API credentials).'),
  Command.withSubcommands([add, list, remove]),
);
