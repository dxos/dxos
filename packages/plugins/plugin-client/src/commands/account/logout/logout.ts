//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import * as Prompt from 'effect/unstable/cli/Prompt';

import { CommandConfig } from '@dxos/cli-util';
import { DX_DATA, getProfilePath } from '@dxos/client-protocol';
import { ConfigService } from '@dxos/config';

export const logout = Command.make(
  'logout',
  {
    force: Options.boolean('force').pipe(Options.withDescription('Skip confirmation prompt.')),
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

    yield* fs.remove(path, { recursive: true }).pipe(
      // v4 wraps the platform's error kinds in a single `PlatformError`, with the normalized tag on
      // its `reason` rather than on the error itself.
      Effect.catchIf(
        (error) => error._tag === 'PlatformError' && error.reason._tag === 'NotFound',
        () => Effect.void,
      ),
    );
    // Recreate the (now empty) data root: the client's SQLite storage opens a file inside it
    // without creating the directory first, so leaving it absent makes every later command fail
    // with "unable to open database file" — including the login this logout exists to enable.
    yield* fs.makeDirectory(path, { recursive: true });
    if (json) {
      yield* Console.log(JSON.stringify({ profile, loggedOut: true }, null, 2));
    } else {
      yield* Console.log(`Logged out of profile (${profile}).`);
    }
  }),
).pipe(Command.withDescription('Log out of the current profile (clears the local identity and data).'));
