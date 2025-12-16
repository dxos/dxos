//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { update } from './update';

export const subscription = Command.make('subscription').pipe(
  Command.withDescription('Manage subscription triggers.'),
  Command.withSubcommands([create, update]),
);
