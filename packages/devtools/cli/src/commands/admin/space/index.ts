//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { del } from './delete';
import { exportSpace } from './export';
import { inspect } from './inspect';
import { list } from './list';

export const space: Command.Command<any, any, any, any> = Command.make('space').pipe(
  Command.withDescription('Manage Edge spaces.'),
  Command.withSubcommands([list, inspect, del, exportSpace]),
);
