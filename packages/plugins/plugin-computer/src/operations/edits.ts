//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { ComputerShellError, Shell } from '#shell';
import { ComputerOperation } from '#types';

const handler: Operation.WithHandler<typeof ComputerOperation.Edits> = ComputerOperation.Edits.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ edits, cwd }) {
      // A failed match is data, not an error: the model is expected to re-read the file and retry
      // with text that matches, which it cannot do if the tool call itself blows up.
      const result = yield* Effect.tryPromise({
        try: (signal) => Shell.applyEdits(edits, { cwd, signal }),
        catch: ComputerShellError.wrap({ ifTypeDiffers: true }),
      });

      return { ...result, files: [...result.files] };
    }),
  ),
);

export default handler;
