//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { type ListActiveIdentitiesResponse } from '@dxos/protocols';

import { adminRequest, formatAdminError } from '../util';

const formatIdentityRow = (identity: ListActiveIdentitiesResponse['identities'][number]): string => {
  const recovery = identity.hasRecovery ? 'recovery' : 'no-recovery';
  const created = identity.createdAt ? new Date(identity.createdAt).toLocaleString() : 'n/a';
  return `  ${identity.identityKey}  ${recovery.padEnd(12)} ${created}`;
};

export const list = Command.make(
  'list',
  {
    limit: Options.integer('limit').pipe(Options.withDescription('Max results per page.'), Options.optional),
    cursor: Options.text('cursor').pipe(Options.withDescription('Pagination cursor.'), Options.optional),
  },
  Effect.fn(function* ({ limit, cursor }) {
    const query: Record<string, string> = {};
    if (limit._tag === 'Some') {
      query.limit = String(limit.value);
    }
    if (cursor._tag === 'Some') {
      query.cursor = cursor.value;
    }

    const data = yield* adminRequest('GET', '/admin/identities', { query }).pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatAdminError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(data, null, 2));
    } else {
      const result = data as ListActiveIdentitiesResponse;
      if (result.identities.length === 0) {
        yield* Console.log('No identities found.');
      } else {
        yield* Console.log(`Identities (${result.identities.length} of ${result.totalCount}):\n`);
        for (const identity of result.identities) {
          yield* Console.log(formatIdentityRow(identity));
        }
        if (result.cursor) {
          yield* Console.log(`\nNext page: --cursor ${result.cursor}`);
        }
        if (result.complete) {
          yield* Console.log('\nAll identities listed.');
        }
      }
    }
  }),
).pipe(Command.withDescription('List identities.'));
