//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { del } from './delete';
import { exportSpace } from './export';
import { inspect } from './inspect';
import { list } from './list';

export const spaces: Command.Command<any, any, any, any> = Command.make('spaces').pipe(
  Command.withDescription('Manage Edge spaces.'),
  Command.withSubcommands([list, inspect, del, exportSpace]),
);
