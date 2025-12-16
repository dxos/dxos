//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { subscription } from './subscription';
import { timer } from './timer';

export const create = Command.make('create').pipe(
  Command.withDescription('Create a trigger.'),
  Command.withSubcommands([subscription, timer]),
);
