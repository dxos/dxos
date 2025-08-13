//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { ClientService } from '../../services';

import { deploy } from './deploy';

export const fn = Command.make('function').pipe(
  Command.withSubcommands([deploy]),
  Command.provide(ClientService.layer),
);
