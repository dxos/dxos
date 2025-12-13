//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ConfigService } from '@dxos/client';

export const view = Command.make(
  'view',
  {},
  Effect.fnUntraced(function* () {
    const config = yield* ConfigService;
    yield* Console.log(JSON.stringify(config.values, null, 2));
  }),
);
