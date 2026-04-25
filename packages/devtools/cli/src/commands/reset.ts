//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as fs from 'node:fs/promises';

import { CommandConfig } from '@dxos/cli-util';
import {
  DX_CACHE,
  DX_CONFIG,
  DX_DATA,
  DX_STATE,
  DEFAULT_PROFILE,
  getProfileConfigPath,
  getProfilePath,
} from '@dxos/client-protocol';

/**
 * Remove a directory and return whether it existed.
 */
const removeIfExists = async (dir: string): Promise<boolean> => {
  try {
    await fs.rm(dir, { recursive: true, force: false });
    return true;
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
};

/**
 * Remove a single file and return whether it existed.
 */
const removeFileIfExists = async (file: string): Promise<boolean> => {
  try {
    await fs.unlink(file);
    return true;
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
};

/**
 * Delete every XDG-style root that could hold profile data. For the default
 * profile we delete the whole root (where data actually lives with the
 * current client defaults). For a named profile we restrict to that
 * profile's sub-directory.
 */
const collectPathsToDelete = (profile: string): string[] => {
  if (profile === DEFAULT_PROFILE) {
    // Default profile: storage lands directly under the XDG roots (see
    // @dxos/client-services/src/packlets/storage/util.ts — dataRoot
    // defaults to DX_DATA). Nuke the whole data/state/cache roots.
    return [DX_DATA, DX_STATE, DX_CACHE, getProfileConfigPath(DX_CONFIG, profile)];
  }
  // Named profile: stay scoped.
  return [
    getProfilePath(DX_DATA, profile),
    getProfilePath(DX_STATE, profile),
    getProfilePath(DX_CACHE, profile),
    getProfileConfigPath(DX_CONFIG, profile),
  ];
};

export const reset = Command.make(
  'reset',
  {
    hard: Options.boolean('hard', { ifPresent: true }).pipe(
      Options.withDescription('Required — deletes ALL local data for the current profile. No remote state is touched.'),
    ),
  },
  ({ hard }) =>
    Effect.gen(function* () {
      const { profile, json } = yield* CommandConfig;

      if (!hard) {
        yield* Console.error(
          `Refusing to run without --hard. This command deletes all local data for profile "${profile}".`,
        );
        return yield* Effect.fail(new Error('Missing --hard flag.'));
      }

      const candidates = collectPathsToDelete(profile);
      const deleted: string[] = [];
      for (const p of candidates) {
        // A trailing .yml means it's the profile config file; everything else
        // is a directory. Pick the right remove API.
        const isFile = p.endsWith('.yml');
        const existed = yield* Effect.tryPromise({
          try: () => (isFile ? removeFileIfExists(p) : removeIfExists(p)),
          catch: (cause) => new Error(`Failed to delete ${p}: ${String(cause)}`),
        });
        if (existed) {
          deleted.push(p);
        }
      }

      if (json) {
        yield* Console.log(JSON.stringify({ profile, deleted }, null, 2));
      } else if (deleted.length === 0) {
        yield* Console.log(`Nothing to delete for profile "${profile}".`);
      } else {
        yield* Console.log(`Deleted ${deleted.length} path(s) for profile "${profile}":`);
        for (const p of deleted) {
          yield* Console.log(`  - ${p}`);
        }
      }
    }),
).pipe(
  Command.withDescription(
    'Delete all local data for the current profile. Pass --hard to confirm. Does not touch remote/edge state.',
  ),
);
