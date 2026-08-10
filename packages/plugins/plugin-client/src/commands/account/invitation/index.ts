//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';

export const invitation = Command.make('invitation').pipe(
  Command.withDescription('Manage account invitation codes.'),
  Command.withSubcommands([create]),
);
