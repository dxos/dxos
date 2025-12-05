//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { list } from './list';
import { create } from './create';

export const profile = Command.make('profile').pipe(
  Command.withDescription('Profile commands.'),
  Command.withSubcommands([list, create]),
);
