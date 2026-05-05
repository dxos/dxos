//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { formatHubError, hubApiRequest } from '../util';

export const revoke = Command.make(
  'revoke',
  {
    code: Args.text({ name: 'code' }).pipe(Args.withDescription('Invitation code to revoke.')),
  },
  Effect.fn(function* ({ code }) {
    yield* hubApiRequest<{ revoked: boolean }>('DELETE', `/api/codes/${code}`).pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatHubError(error)))),
    );
    yield* Console.log(`Revoked code ${code}.`);
  }),
).pipe(Command.withDescription('Revoke an unredeemed invitation code.'));
