//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { create } from './create.ts';
import { del } from './delete.ts';
import { importCommand } from './import.ts';
import { inspect } from './inspect.ts';
import { list } from './list.ts';
import { reset } from './reset.ts';

export const profile = Command.make('profile').pipe(
  Command.withDescription('Profile commands.'),
  Command.withSubcommands([create, del, importCommand, inspect, list, reset]),
);
