//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { view } from './view';

export const config = Command.make('config').pipe(
  Command.withDescription('Config commands.'),
  Command.withSubcommands([view]),
);
