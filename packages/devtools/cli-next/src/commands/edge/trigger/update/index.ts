//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { subscription } from './subscription';
import { timer } from './timer';

export const update = Command.make('update').pipe(
  Command.withDescription('Update a trigger.'),
  Command.withSubcommands([subscription, timer]),
);
