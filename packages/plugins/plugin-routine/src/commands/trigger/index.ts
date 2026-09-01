//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { create } from './create/index.ts';
import { list } from './list.ts';
import { remove } from './remove.ts';
import { update } from './update/index.ts';

// TODO(wittjosiah): Rename to automation to align with Composer?
export const trigger = Command.make('trigger').pipe(
  Command.withDescription('Manage EDGE triggers.'),
  Command.withSubcommands([create, list, remove, update]),
);
