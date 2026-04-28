//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { grant } from './grant';
import { list } from './list';

export const accounts: Command.Command<any, any, any, any> = Command.make('accounts').pipe(
  Command.withDescription('Manage Hub accounts.'),
  Command.withSubcommands([list, grant]),
);
