//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { del } from './delete';
import { inspect } from './inspect';

export const space: Command.Command<any, any, any, any> = Command.make('space').pipe(
  Command.withDescription('EDGE space commands.'),
  Command.withSubcommands([inspect, del]),
);
