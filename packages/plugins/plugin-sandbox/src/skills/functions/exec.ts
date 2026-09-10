//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import { ClientService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SandboxOperation } from '#types';

import { mergeExecEnv } from '../../services/sandbox-env';
import { createSandboxClient } from '../../services/sandbox-url';

/**
 * How long a command may run when the caller sets no limit. The service's own default is two
 * minutes, which an install or a deploy overruns; five fits those and bounds a hung command.
 */
const DEFAULT_EXEC_TIMEOUT = 5 * 60 * 1_000;

export default SandboxOperation.Exec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, command, cwd, env, timeout = DEFAULT_EXEC_TIMEOUT }) {
      const { db } = yield* Database.Service;
      const client = yield* ClientService;

      const loaded = yield* Database.load(sandbox);
      const sandboxId = loaded.id;
      const spaceId = db.spaceId;
      const sandboxClient = createSandboxClient(client);
      const mergedEnv = yield* mergeExecEnv(loaded.credentials, env);

      // Yielded directly rather than through `Effect.promise`: that wrapper is uninterruptible, so
      // terminating the operation left the request running — the tool handler reported "Operation
      // was terminated" while the fetch underneath it stayed open.
      //
      // A request failure is reported as a failed command rather than raised. `Operation.make` has no
      // error channel, so a typed failure escaping here is not part of the operation's contract and
      // reaches the tool runtime as a result missing every declared key ("Missing key at [stdout]").
      // A non-zero exit carrying the reason is also what the model can actually act on.
      return yield* sandboxClient.exec(spaceId, sandboxId, { command, cwd, env: mergedEnv, timeout }).pipe(
        Effect.catch((error) =>
          Effect.succeed({
            stdout: '',
            stderr: `sandbox exec failed: ${describeError(error)}`,
            exitCode: -1,
            success: false,
          }),
        ),
      );
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

/** Message for a failed request, kept short enough to be useful in a tool result. */
const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
