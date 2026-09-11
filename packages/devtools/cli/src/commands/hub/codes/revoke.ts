//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';

import { formatHubError, hubApiRequest } from '../util.ts';

export const revoke = Command.make(
  'revoke',
  {
    code: Args.string('code').pipe(Args.withDescription('Invitation code to revoke.')),
  },
  Effect.fn(function* ({ code }) {
    yield* hubApiRequest<{ revoked: boolean }>('DELETE', `/api/code/${code}`).pipe(
      Effect.catch((error) => Effect.fail(new Error(formatHubError(error)))),
    );
    yield* Console.log(`Revoked code ${code}.`);
  }),
).pipe(Command.withDescription('Revoke an unredeemed invitation code.'));
