//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as ChildProcess from 'effect/process/ChildProcess';
import * as ChildProcessSpawner from 'effect/process/ChildProcessSpawner';
import * as Stream from 'effect/Stream';

import { GitError } from './errors.ts';

/** Runs `git <args>` in `cwd` and returns trimmed stdout; a non-zero exit fails with {@link GitError}. */
export const git = Effect.fnUntraced(function* (cwd: string, ...args: string[]) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  return yield* Effect.scoped(
    Effect.gen(function* () {
      const handle = yield* spawner.spawn(ChildProcess.make('git', args, { cwd }));
      const [stdout, stderr, exitCode] = yield* Effect.all(
        [
          Stream.mkString(Stream.decodeText(handle.stdout)),
          Stream.mkString(Stream.decodeText(handle.stderr)),
          handle.exitCode,
        ],
        { concurrency: 'unbounded' },
      );
      if (exitCode !== 0) {
        return yield* Effect.fail(new GitError({ context: { args, exitCode, stderr: stderr.trim() } }));
      }
      return stdout.trim();
    }),
  ).pipe(Effect.catchTag('PlatformError', (error) => Effect.fail(new GitError({ cause: error, context: { args } }))));
});

/** Splits command output into its non-empty lines. */
export const lines = (text: string): string[] => text.split('\n').filter(Boolean);
