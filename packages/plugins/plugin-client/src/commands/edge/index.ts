//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { status } from './status.ts';

export const edge = Command.make('edge').pipe(
  Command.withDescription('EDGE commands.'),
  Command.withSubcommands([status]),
);
