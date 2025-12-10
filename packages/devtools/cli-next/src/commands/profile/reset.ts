//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';

import { DX_DATA, getProfilePath } from '@dxos/client-protocol';
import { ConfigService } from '@dxos/config';

import { CommandConfig } from '../../services';

export const reset = Command.make(
  'reset',
  {
    force: Options.boolean('force', { ifPresent: true }).pipe(Options.withDescription('Skip confirmation prompt')),
  },
  Effect.fnUntraced(function* ({ force }) {
    const fs = yield* FileSystem.FileSystem;
    const config = yield* ConfigService;
    const { profile } = yield* CommandConfig;
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
  }),
);
