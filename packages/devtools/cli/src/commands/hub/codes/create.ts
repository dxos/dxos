//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { type AdminCreateInvitationCodesResponse } from '@dxos/protocols';

import { formatHubError, hubApiRequest } from '../util.ts';

export const create = Command.make(
  'create',
  {
    count: Options.integer('count').pipe(
      Options.withDescription('Number of bootstrap codes to create.'),
      Options.withAlias('n'),
      Options.withDefault(1),
    ),
    note: Options.string('note').pipe(Options.withDescription('Optional note for these codes.'), Options.optional),
  },
  Effect.fn(function* ({ count, note }) {
    const body: { count: number; note?: string } = { count };
    if (Option.isSome(note)) {
      body.note = note.value;
    }
    const result = yield* hubApiRequest<AdminCreateInvitationCodesResponse>('POST', '/api/code', { body }).pipe(
      Effect.catch((error) => Effect.fail(new Error(formatHubError(error)))),
    );
    yield* Console.log(`Created ${result.codes.length} invitation code(s):`);
    for (const code of result.codes) {
      yield* Console.log(`  ${code}`);
    }
  }),
).pipe(Command.withDescription('Create bootstrap invitation codes.'));
