//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { type GetAccountResponse } from '@dxos/protocols';

import { HubApiError, formatHubError, hubApiRequest } from '../util.ts';

export const grant = Command.make(
  'grant',
  {
    identityDid: Args.String('identity-did').pipe(Args.withDescription('Account identity DID.')),
    count: Options.Int('count').pipe(Options.withDescription('Number of invitations to add.'), Options.withAlias('n')),
  },
  Effect.fn(function* ({ identityDid, count }) {
    const result = yield* hubApiRequest<GetAccountResponse>('POST', `/api/account/${identityDid}/invitations/grant`, {
      body: { count },
    }).pipe(Effect.catch((error) => Effect.fail(new HubApiError({ message: formatHubError(error), cause: error }))));

    yield* Console.log(`Granted ${count} invitations. Account now has ${result.invitationsRemaining} remaining.`);
  }),
).pipe(Command.withDescription('Grant additional invitations to an account.'));
