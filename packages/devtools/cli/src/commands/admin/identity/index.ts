//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { del } from './delete.ts';
import { inspect } from './inspect.ts';
import { list } from './list.ts';

export const identity: Command.Command<any, any, any, any, any> = Command.make('identity').pipe(
  Command.withDescription('Manage Edge identities.'),
  Command.withSubcommands([list, inspect, del]),
);
