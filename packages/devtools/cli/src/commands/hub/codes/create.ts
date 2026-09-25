//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { type AdminCreateInvitationCodesRequest, type AdminCreateInvitationCodesResponse } from '@dxos/protocols';

import { HubApiError, formatHubError, hubApiRequest } from '../util.ts';

export const create = Command.make(
  'create',
  {
    count: Options.Int('count').pipe(
      Options.withDescription('Number of bootstrap codes to create.'),
      Options.withAlias('n'),
      Options.withDefault(1),
    ),
    note: Options.String('note').pipe(Options.withDescription('Optional note for these codes.'), Options.optional),
    uses: Options.Int('uses').pipe(
      Options.withDescription('How many accounts may sign up with each code (e.g. 50 for a meetup).'),
      Options.withDefault(1),
    ),
    prefix: Options.String('prefix').pipe(
      Options.withDescription(
        'Vanity prefix (e.g. SF-MEETUP); the code gets a dash and 4 random characters appended. Use with --count 1.',
      ),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ count, note, uses, prefix }) {
    const body: AdminCreateInvitationCodesRequest = {
      count,
      maxRedemptions: uses,
      note: Option.getOrUndefined(note),
      prefix: Option.getOrUndefined(prefix),
    };
    const result = yield* hubApiRequest<AdminCreateInvitationCodesResponse>('POST', '/api/code', { body }).pipe(
      Effect.catch((error) => Effect.fail(new HubApiError({ message: formatHubError(error), cause: error }))),
    );
    yield* Console.log(`Created ${result.codes.length} invitation code(s):`);
    for (const code of result.codes) {
      yield* Console.log(`  ${code}`);
    }
  }),
).pipe(Command.withDescription('Create bootstrap invitation codes, or one vanity code with --prefix.'));
