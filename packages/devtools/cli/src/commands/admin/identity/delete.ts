//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig } from '@dxos/cli-util';
import { type DeleteIdentityResponse, type LegacyDeleteIdentityResponse } from '@dxos/protocols';

import { adminRequest, formatAdminError, readIdentityDid } from '../util.ts';

export const del = Command.make(
  'delete',
  {
    identityKey: Args.string('identityKey'),
    force: Options.boolean('force').pipe(
      Options.withDescription('Confirm irreversible deletion.'),
      Options.withDefault(false),
    ),
  },
  Effect.fn(function* ({ identityKey, force }) {
    if (!force) {
      return yield* Effect.fail(new Error('This action is irreversible. Pass --force to confirm.'));
    }

    const result = yield* adminRequest<DeleteIdentityResponse | LegacyDeleteIdentityResponse>(
      'DELETE',
      `/admin/identities/${identityKey}`,
    ).pipe(Effect.catch((error) => Effect.fail(new Error(formatAdminError(error)))));

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(result, null, 2));
    } else {
      yield* Console.log(`Identity ${readIdentityDid(result)} deletion ${result.status}.`);
    }
  }),
).pipe(Command.withDescription('Delete an identity (irreversible).'));
