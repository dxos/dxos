//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';

import { CommandConfig } from '@dxos/cli-util';
import { type AdminListInvitationCodesResponse } from '@dxos/protocols';

import { HubApiError, formatHubError, hubApiRequest } from '../util.ts';

type CodeRow = AdminListInvitationCodesResponse['codes'][number];

const redemptionsOf = (row: CodeRow): number =>
  row.redemptionCount ?? (row.redeemedAt || row.redeemedByIdentityDid ? 1 : 0);

const statusOf = (row: CodeRow): string => {
  if (row.revokedAt) {
    return 'revoked';
  }
  if (redemptionsOf(row) >= (row.maxRedemptions ?? 1)) {
    return 'redeemed';
  }
  return 'available';
};

const usesOf = (row: CodeRow): string => `${redemptionsOf(row)}/${row.maxRedemptions ?? 1}`;

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const result = yield* hubApiRequest<AdminListInvitationCodesResponse>('GET', '/api/code').pipe(
      Effect.catch((error) => Effect.fail(new HubApiError({ message: formatHubError(error), cause: error }))),
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
      const issuer = row.issuedByIdentityDid ? row.issuedByIdentityDid.slice(0, 20) + '…' : 'bootstrap';
      const created = new Date(row.createdAt).toLocaleString();
      yield* Console.log(
        `  ${row.code}  ${status.padEnd(10)} ${usesOf(row).padEnd(8)} issued-by=${issuer.padEnd(13)} ${created}  ${row.note ?? ''}`,
      );
    }
  }),
).pipe(Command.withDescription('List invitation codes.'));
