//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { deploy } from './deploy';
import { importCommand } from './import';
import { invoke } from './invoke';
import { list } from './list';
import { trace } from './trace';

// TODO(wittjosiah): Alias to `fn`.
export const fn = Command.make('function').pipe(
  Command.withDescription('Manage EDGE functions.'),
  Command.withSubcommands([deploy, list, invoke, importCommand, trace]),
);
