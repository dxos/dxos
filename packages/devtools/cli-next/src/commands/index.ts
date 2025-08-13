//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { fn } from './functions';
import { halo } from './halo';
import { spaces } from './spaces';

const version = '0.8.3'; // {x-release-please-version}

const command = Command.make('dx').pipe(Command.withSubcommands([halo, fn, spaces]));

export const run = Command.run(command, { name: 'DXOS CLI', version });
