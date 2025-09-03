//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { query } from './query';
import { remove } from './remove';
import { stats } from './stats';

export const object = Command.make('object').pipe(
  Command.withDescription('Manage objects.'),
  Command.withSubcommands([query, stats, remove]),
);
