//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { create } from './create.ts';
import { list } from './list.ts';
import { revoke } from './revoke.ts';

export const code: Command.Command<any, any, any, any, any> = Command.make('code').pipe(
  Command.withDescription('Manage invitation codes.'),
  Command.withSubcommands([list, create, revoke]),
);
