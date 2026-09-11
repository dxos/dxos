//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import * as Prompt from 'effect/unstable/cli/Prompt';

import { CommandConfig, print } from '@dxos/cli-util';
import { DX_DATA, getProfilePath } from '@dxos/client-protocol';
import { ConfigService } from '@dxos/config';

import { printProfileReset } from './util.ts';

export const reset = Command.make(
  'reset',
  {
    force: Options.boolean('force').pipe(Options.withDescription('Skip confirmation prompt')),
  },
  Effect.fnUntraced(function* ({ force }) {
    const fs = yield* FileSystem.FileSystem;
    const config = yield* ConfigService;
    const { json, profile } = yield* CommandConfig;
    const path = config.values.runtime?.client?.storage?.dataRoot ?? getProfilePath(DX_DATA, profile);
    if (!force) {
      const confirmed = yield* Prompt.confirm({
        message: `Are you sure you want to reset the profile (${profile})?`,
        initial: false,
      });
      if (!confirmed) {
        return;
      }
    }

    yield* fs.remove(path, { recursive: true });
    if (json) {
      yield* Console.log(JSON.stringify({ profile, reset: true }, null, 2));
    } else {
      yield* Console.log(print(printProfileReset(profile)));
    }
  }),
);
