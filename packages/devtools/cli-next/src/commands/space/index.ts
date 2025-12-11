//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { list } from './list';
import { sync } from './sync';

export const space = Command.make('space').pipe(
  Command.withDescription('Manage ECHO spaces.'),
  Command.withSubcommands([list, sync]),
);
