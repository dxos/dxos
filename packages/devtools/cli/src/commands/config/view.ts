//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Yaml from 'yaml';

import { ConfigService } from '@dxos/client';

import { CommandConfig } from '../../services';

export const view = Command.make(
  'view',
  {},
  Effect.fnUntraced(function* () {
    const config = yield* ConfigService;
    const { json } = yield* CommandConfig;

    if (json) {
      yield* Console.log(JSON.stringify(config.values, null, 2));
    } else {
      yield* Console.log(Yaml.stringify(config.values));
    }
  }),
);
