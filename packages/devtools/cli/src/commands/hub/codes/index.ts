//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { list } from './list';
import { revoke } from './revoke';

export const code: Command.Command<any, any, any, any> = Command.make('code').pipe(
  Command.withDescription('Manage invitation codes.'),
  Command.withSubcommands([list, create, revoke]),
);
