//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { query } from './query';

export const queue = Command.make('queue').pipe(
  Command.withDescription('Manage queues.'),
  Command.withSubcommands([query]),
);
