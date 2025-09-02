//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { deploy } from './deploy';
import { invoke } from './invoke';
import { search } from './search';
import { list } from './list';
import { importCommand } from './import';

export const fn = Command.make('function').pipe(
  Command.withDescription('Manage EDGE functions.'),
  Command.withSubcommands([deploy, list, search, invoke, importCommand]),
);
