//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { grant } from './grant.ts';
import { list } from './list.ts';

export const account: Command.Command<any, any, any, any, any> = Command.make('account').pipe(
  Command.withDescription('Manage Hub accounts.'),
  Command.withSubcommands([list, grant]),
);
