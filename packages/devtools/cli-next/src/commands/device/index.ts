//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { info } from './info';
import { list } from './list';
import { update } from './update';

export const device = Command.make('device').pipe(
  Command.withDescription('Manage HALO devices.'),
  Command.withSubcommands([info, list, update]),
);

