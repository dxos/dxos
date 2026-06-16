//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as FileSystem from '@effect/platform/FileSystem';
import { SystemError } from '@effect/platform/Error';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { DX_DATA, getProfilePath } from '@dxos/client-protocol';
import { ConfigService } from '@dxos/config';

export const logout = Command.make(
  'logout',
  {
    force: Options.boolean('force', { ifPresent: true }).pipe(Options.withDescription('Skip confirmation prompt.')),
  },
  Effect.fnUntraced(function* ({ force }) {
    const fs = yield* FileSystem.FileSystem;
    const config = yield* ConfigService;
    const { json, profile } = yield* CommandConfig;
    const path = config.values.runtime?.client?.storage?.dataRoot ?? getProfilePath(DX_DATA, profile);
    if (!force) {
      const confirmed = yield* Prompt.confirm({
        message: `Log out of profile (${profile})? This removes the local identity and data; spaces re-sync on next login.`,
        initial: false,
      }).pipe(Prompt.run);
      if (!confirmed) {
        return;
      }
    }

    yield* fs
      .remove(path, { recursive: true })
      .pipe(Effect.catchIf((e): e is SystemError => e._tag === 'SystemError' && e.reason === 'NotFound', () => Effect.void));
    if (json) {
      yield* Console.log(JSON.stringify({ profile, loggedOut: true }, null, 2));
    } else {
      yield* Console.log(`Logged out of profile (${profile}).`);
    }
  }),
).pipe(Command.withDescription('Log out of the current profile (clears the local identity and data).'));
