//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { del } from './delete';
import { importCommand } from './import';
import { inspect } from './inspect';
import { list } from './list';
import { reset } from './reset';

export const profile = Command.make('profile').pipe(
  Command.withDescription('Profile commands.'),
  Command.withSubcommands([create, del, importCommand, inspect, list, reset]),
);
