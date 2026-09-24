//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig } from '@dxos/cli-util';
import { type DeleteSpaceResponse } from '@dxos/protocols';

import { CliError } from '../../../util/errors.ts';
import { AdminApiError, adminRequest, formatAdminError } from '../util.ts';

export const del = Command.make(
  'delete',
  {
    spaceId: Args.String('spaceId'),
    force: Options.Boolean('force').pipe(
      Options.withDescription('Confirm irreversible deletion.'),
      Options.withDefault(false),
    ),
  },
  Effect.fn(function* ({ spaceId, force }) {
    if (!force) {
      return yield* Effect.fail(new CliError({ message: 'This action is irreversible. Pass --force to confirm.' }));
    }

    const result = yield* adminRequest<DeleteSpaceResponse>('DELETE', `/admin/spaces/${spaceId}`).pipe(
      Effect.catch((error) => Effect.fail(new AdminApiError({ message: formatAdminError(error), cause: error }))),
    );

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(result, null, 2));
    } else {
      yield* Console.log(`Space ${result.spaceId} deletion ${result.status}.`);
    }
  }),
).pipe(Command.withDescription('Delete a space (irreversible).'));
