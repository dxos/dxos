//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { deploy } from './deploy/index.ts';
import { importCommand } from './import.ts';
import { invoke } from './invoke.ts';
import { list } from './list.ts';
import { trace } from './trace/index.ts';

// TODO(wittjosiah): Alias to `fn`.
export const fn = Command.make('function').pipe(
  Command.withDescription('Manage EDGE functions.'),
  Command.withSubcommands([deploy, importCommand, invoke, list, trace]),
);
