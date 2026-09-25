//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { del } from './delete.ts';
import { exportSpace } from './export.ts';
import { inspect } from './inspect.ts';
import { list } from './list.ts';

export const space: Command.Command<any, any, any, any, any> = Command.make('space').pipe(
  Command.withDescription('Manage Edge spaces.'),
  Command.withSubcommands([list, inspect, del, exportSpace]),
);
