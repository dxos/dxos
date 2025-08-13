//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { ClientService } from '../../services';

import { list } from './list';
import { query } from './query';
import { sync } from './sync';

export const spaces = Command.make('spaces').pipe(
  Command.withSubcommands([list, query, sync]),
  Command.provide(ClientService.layer),
);
