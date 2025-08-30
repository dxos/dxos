//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { deploy } from './deploy';
import { invoke } from './invoke';
import { list } from './list';

export const fn = Command.make('function').pipe(
  Command.withDescription('Manage EDGE functions.'),
  Command.withSubcommands([deploy, list, invoke]),
);
