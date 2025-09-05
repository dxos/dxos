//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { query } from './query';

export const queue = Command.make('queue').pipe(
  Command.withDescription('Manage queues.'),
  Command.withSubcommands([query]),
);
