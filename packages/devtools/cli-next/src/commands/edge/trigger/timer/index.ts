//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { create } from './create';
import { update } from './update';
import { list } from './list';

export const timer = Command.make('timer').pipe(
  Command.withDescription('Manage timer triggers.'),
  Command.withSubcommands([create, update, list]),
);
