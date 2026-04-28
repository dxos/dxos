//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { type AdminListInvitationCodesResponse } from '@dxos/protocols';

import { formatHubError, hubApiRequest } from '../util';

const statusOf = (row: AdminListInvitationCodesResponse['codes'][number]): string => {
  if (row.revokedAt) {
    return 'revoked';
  }
  if (row.redeemedByIdentityKey) {
    return 'redeemed';
  }
  return 'available';
};

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const result = yield* hubApiRequest<AdminListInvitationCodesResponse>('GET', '/api/codes').pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatHubError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.codes.length === 0) {
      yield* Console.log('No invitation codes.');
      return;
    }
    yield* Console.log(`Invitation codes (${result.codes.length}):\n`);
    for (const row of result.codes) {
      const status = statusOf(row);
      const issuer = row.issuedByIdentityKey ? row.issuedByIdentityKey.slice(0, 12) + '…' : 'bootstrap';
      const created = new Date(row.createdAt).toLocaleString();
      yield* Console.log(
        `  ${row.code}  ${status.padEnd(10)} issued-by=${issuer.padEnd(13)} ${created}  ${row.note ?? ''}`,
      );
    }
  }),
).pipe(Command.withDescription('List invitation codes.'));
