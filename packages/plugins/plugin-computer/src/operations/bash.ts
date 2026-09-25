//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { ComputerShellError, Shell } from '#shell';
import { ComputerOperation } from '#types';

const handler: Operation.WithHandler<typeof ComputerOperation.Bash> = ComputerOperation.Bash.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script, cwd, timeout }) {
      const result = yield* Effect.tryPromise({
        try: (signal) => Shell.exec({ script, cwd, timeout }, { signal }),
        // An unreachable host means the vite plugin is not mounted, which no retry can fix; the
        // failure has to reach the developer rather than read as an empty command output.
        catch: ComputerShellError.wrap({ ifTypeDiffers: true }),
      });

      return {
        ...result,
        // The wire reports a killed process as `null`; the tool reports -1, so the model always has
        // a number to compare against and `success` to read first.
        exitCode: result.exitCode ?? -1,
        success: result.exitCode === 0,
      };
    }),
  ),
);

export default handler;
