//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { list } from './list';
import { revoke } from './revoke';

export const codes: Command.Command<any, any, any, any> = Command.make('codes').pipe(
  Command.withDescription('Manage invitation codes.'),
  Command.withSubcommands([list, create, revoke]),
);
