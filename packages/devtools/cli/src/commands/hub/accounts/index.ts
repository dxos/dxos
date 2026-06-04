//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { grant } from './grant';
import { list } from './list';

export const account: Command.Command<any, any, any, any> = Command.make('account').pipe(
  Command.withDescription('Manage Hub accounts.'),
  Command.withSubcommands([list, grant]),
);
