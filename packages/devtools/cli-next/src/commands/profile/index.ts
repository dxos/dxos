//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { del } from './delete';
import { list } from './list';
import { reset } from './reset';

export const profile = Command.make('profile').pipe(
  Command.withDescription('Profile commands.'),
  Command.withSubcommands([list, create, del, reset]),
);
