//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import * as Effect from 'effect/Effect';

import { ConfigService } from '../../services';

export const view = Command.make(
  'view',
  {},
  Effect.fnUntraced(function* () {
    const config = yield* ConfigService;
    console.log(JSON.stringify(config.values, null, 2));
  }),
);
