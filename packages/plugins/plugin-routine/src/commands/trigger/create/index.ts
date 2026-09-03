//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { feed } from './feed.ts';
import { subscription } from './subscription.ts';
import { timer } from './timer.ts';

export const create = Command.make('create').pipe(
  Command.withDescription('Create a trigger.'),
  Command.withSubcommands([subscription, timer, feed]),
);
