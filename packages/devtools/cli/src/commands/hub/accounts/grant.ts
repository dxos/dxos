//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { type GetAccountResponse } from '@dxos/protocols';

import { formatHubError, hubApiRequest } from '../util';

export const grant = Command.make(
  'grant',
  {
    identityDid: Args.text({ name: 'identity-did' }).pipe(Args.withDescription('Account identity DID.')),
    count: Options.integer('count').pipe(
      Options.withDescription('Number of invitations to add.'),
      Options.withAlias('n'),
    ),
  },
  Effect.fn(function* ({ identityDid, count }) {
    const result = yield* hubApiRequest<GetAccountResponse>('POST', `/api/account/${identityDid}/invitations/grant`, {
      body: { count },
    }).pipe(Effect.catchAll((error) => Effect.fail(new Error(formatHubError(error)))));

    yield* Console.log(`Granted ${count} invitations. Account now has ${result.invitationsRemaining} remaining.`);
  }),
).pipe(Command.withDescription('Grant additional invitations to an account.'));
