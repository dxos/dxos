//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { user } from './user';

export const hub = Command.make('hub').pipe(Command.withDescription('Manage Hub.'), Command.withSubcommands([user]));
