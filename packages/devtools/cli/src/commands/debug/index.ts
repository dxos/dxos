//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { diagnostics } from './diagnostics';
import { generate } from './generate';
import { inspector } from './inspector';

export const debug = Command.make('debug').pipe(
  Command.withDescription('Debug commands.'),
  Command.withSubcommands([diagnostics, generate, inspector]),
);
