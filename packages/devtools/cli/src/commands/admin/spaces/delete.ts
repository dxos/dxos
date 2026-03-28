//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { type DeleteSpaceResponse } from '@dxos/protocols';

import { adminRequest, formatAdminError } from '../util';

export const del = Command.make(
  'delete',
  {
    spaceId: Args.text({ name: 'spaceId' }),
    force: Options.boolean('force').pipe(
      Options.withDescription('Confirm irreversible deletion.'),
      Options.withDefault(false),
    ),
  },
  Effect.fn(function* ({ spaceId, force }) {
    if (!force) {
      yield* Console.error('This action is irreversible. Pass --force to confirm.');
      return;
    }

    const data = yield* adminRequest('DELETE', `/admin/spaces/${spaceId}`).pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatAdminError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(data, null, 2));
    } else {
      const result = data as DeleteSpaceResponse;
      yield* Console.log(`Space ${result.spaceId} deletion ${result.status}.`);
    }
  }),
).pipe(Command.withDescription('Delete a space (irreversible).'));
