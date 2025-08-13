//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { ClientService } from '../../services';

import { create } from './create';
import { identity } from './identity';
import { join } from './join';

export const halo = Command.make('halo').pipe(
  Command.withSubcommands([create, identity, join]),
  Command.provide(ClientService.layer),
);
