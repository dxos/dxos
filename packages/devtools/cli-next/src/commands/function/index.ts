//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { deploy } from './deploy';
import { importCommand } from './import';
import { invoke } from './invoke';
import { list } from './list';
import { trace } from './trace';

export const fn = Command.make('function').pipe(
  Command.withDescription('Manage EDGE functions.'),
  Command.withSubcommands([deploy, importCommand, invoke, list, trace]),
);
