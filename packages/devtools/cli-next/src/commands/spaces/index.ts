//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { list } from './list';
import { sync } from './sync';

export const spaces = Command.make('spaces').pipe(
  Command.withDescription('Manage ECHO spaces.'),
  Command.withSubcommands([list, sync]),
);
