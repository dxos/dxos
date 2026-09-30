//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { view } from './view.ts';

export const config = Command.make('config').pipe(
  Command.withDescription('Config commands.'),
  Command.withSubcommands([view]),
);
