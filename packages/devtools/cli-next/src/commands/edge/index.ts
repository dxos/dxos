//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { fn } from './functions';
import { status } from './status';
import { trigger } from './trigger';

export const edge = Command.make('edge').pipe(
  Command.withDescription('EDGE commands.'),
  Command.withSubcommands([fn, status, trigger]),
);
