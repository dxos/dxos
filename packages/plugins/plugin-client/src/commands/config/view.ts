//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';
import * as Yaml from 'yaml';

import { CommandConfig } from '@dxos/cli-util';
import { ConfigService } from '@dxos/client';
import { DX_CONFIG, getProfileConfigPath } from '@dxos/client-protocol';

export const view = Command.make(
  'view',
  {},
  Effect.fnUntraced(function* () {
    const config = yield* ConfigService;
    const { json, profile } = yield* CommandConfig;
    const configPath = getProfileConfigPath(DX_CONFIG, profile);

    if (json) {
      yield* Console.log(JSON.stringify(config.values, null, 2));
    } else {
      yield* Console.log(`Path: ${configPath}`);
      yield* Console.log(Yaml.stringify(config.values));
    }
  }),
);
