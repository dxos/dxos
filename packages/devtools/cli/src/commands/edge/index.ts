//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { status } from './status';

export const edge = Command.make('edge').pipe(
  Command.withDescription('EDGE commands.'),
  Command.withSubcommands([status]),
);
