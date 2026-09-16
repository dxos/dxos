//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { create } from './create/index.ts';

export const invitation = Command.make('invitation').pipe(
  Command.withDescription('Manage account invitation codes.'),
  Command.withSubcommands([create]),
);
