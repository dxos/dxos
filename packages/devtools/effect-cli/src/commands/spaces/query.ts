//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Effect } from 'effect';

export const query = Command.make('query', {}, () => Effect.gen(function* () {}));
