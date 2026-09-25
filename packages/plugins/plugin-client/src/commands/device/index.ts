//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { info } from './info/index.ts';
import { list } from './list/index.ts';
import { update } from './update/index.ts';

export const device = Command.make('device').pipe(
  Command.withDescription('Manage HALO devices.'),
  Command.withSubcommands([info, list, update]),
);
