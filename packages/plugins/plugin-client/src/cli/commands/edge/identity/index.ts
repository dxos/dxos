//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { del } from './delete';
import { inspect } from './inspect';

export const identity: Command.Command<any, any, any, any> = Command.make('identity').pipe(
  Command.withDescription('EDGE identity commands.'),
  Command.withSubcommands([inspect, del]),
);
