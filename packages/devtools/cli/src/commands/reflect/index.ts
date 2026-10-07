//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';

import { idiom } from './idiom/index.ts';

export const reflect = Command.make('reflect').pipe(
  Command.withDescription('Reflective tooling over the monorepo (idioms, introspect).'),
  Command.withSubcommands([idiom]),
);
