//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { deploy } from './deploy';

export const fn = Command.make('function').pipe(
  Command.withSubcommands([deploy]),
  Command.withDescription('Manage EDGE functions.'),
);
