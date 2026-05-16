//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { idioms } from './idioms';

export const deus = Command.make('deus').pipe(
  Command.withDescription('Deus modeling-language tools (idioms, dialects).'),
  Command.withSubcommands([idioms]),
);
