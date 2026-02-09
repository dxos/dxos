//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { add } from './add';
import { list } from './list';
import { remove } from './remove';

export const integration = Command.make('integration').pipe(
  Command.withDescription('Manage integrations (OAuth tokens).'),
  Command.withSubcommands([add, list, remove]),
);
