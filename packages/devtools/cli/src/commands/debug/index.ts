//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { diagnostics } from './diagnostics.ts';
import { generate } from './generate.ts';
import { inspector } from './inspector.ts';

export const debug = Command.make('debug').pipe(
  Command.withDescription('Debug commands.'),
  Command.withSubcommands([diagnostics, generate, inspector]),
);
