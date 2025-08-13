//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';

import { create } from './create';
import { identity } from './identity';
import { join } from './join';

export const halo = Command.make('halo').pipe(Command.withSubcommands([create, identity, join]));
