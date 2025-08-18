//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { fn } from './functions';
import { status } from './status';

export const edge = Command.make('edge').pipe(
  Command.withDescription('EDGE commands.'),
  Command.withSubcommands([fn, status]),
);
