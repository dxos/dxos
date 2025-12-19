//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { list } from './list';
import { remove } from './remove';
import { update } from './update';

// TODO(wittjosiah): Rename to automation to align with Composer?
export const trigger = Command.make('trigger').pipe(
  Command.withDescription('Manage EDGE triggers.'),
  Command.withSubcommands([create, list, remove, update]),
);
