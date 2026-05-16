//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { list } from './list';

export const idiom = Command.make('idiom').pipe(
  Command.withDescription('Idiom catalog tools.'),
  Command.withSubcommands([list]),
);
