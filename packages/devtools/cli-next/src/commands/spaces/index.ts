//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { list } from './list';
import { sync } from './sync';

export const spaces = Command.make('spaces').pipe(
  Command.withDescription('Manage ECHO spaces.'),
  Command.withSubcommands([list, sync]),
);
