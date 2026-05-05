//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { type AdminListAccountsResponse } from '@dxos/protocols';

import { formatHubError, hubApiRequest } from '../util';

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const result = yield* hubApiRequest<AdminListAccountsResponse>('GET', '/api/accounts').pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatHubError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.accounts.length === 0) {
      yield* Console.log('No accounts.');
      return;
    }
    yield* Console.log(`Accounts (${result.accounts.length}):\n`);
    for (const account of result.accounts) {
      const verified = account.emailVerified ? 'verified' : 'unverified';
      const created = new Date(account.createdAt).toLocaleString();
      yield* Console.log(
        `  ${account.identityKey}  ${account.email.padEnd(36)} ${verified.padEnd(11)} invites=${account.invitationsRemaining}  ${created}`,
      );
    }
  }),
).pipe(Command.withDescription('List hub accounts.'));
