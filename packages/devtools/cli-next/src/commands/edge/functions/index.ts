//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { deploy } from './deploy';
import { list } from './list';
import { invoke } from './invoke';

export const fn = Command.make('function').pipe(
  Command.withDescription('Manage EDGE functions.'),
  Command.withSubcommands([deploy, list, invoke]),
);
