//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { create } from './create';
import { update } from './update';

export const timer = Command.make('timer').pipe(
  Command.withDescription('Manage timer triggers.'),
  Command.withSubcommands([create, update]),
);
