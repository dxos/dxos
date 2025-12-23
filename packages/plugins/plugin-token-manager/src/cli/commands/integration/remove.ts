//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { flushAndSync, print, spaceLayer, withTypes } from '@dxos/cli-util';
import { Common } from '@dxos/cli-util';
import { DXN, Filter } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

import { printTokenRemoved } from './util';

export const remove = Command.make(
  'remove',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: Options.text('id').pipe(Options.withDescription('The token ID.'), Options.optional),
  },
  ({ id }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const token = yield* Option.match(id, {
        onSome: (value) =>
          Effect.gen(function* () {
            const dxn = DXN.fromLocalObjectId(value);
            return yield* Database.Service.resolve(dxn, AccessToken.AccessToken);
          }),
        onNone: () =>
          Effect.gen(function* () {
            const filter = Filter.type(AccessToken.AccessToken);
            const tokens = yield* Database.Service.runQuery(filter);

            if (tokens.length === 0) {
              return yield* Effect.fail(new Error('No tokens found to remove'));
            }

            const choices = tokens.map((token) => ({
              title: `${token.note || token.source} (${token.source})`,
              value: token.id,
            }));

            const selectedId = yield* Prompt.select({
              message: 'Select token to remove:',
              choices,
            }).pipe(Prompt.run);

            const dxn = DXN.fromLocalObjectId(selectedId);
            return yield* Database.Service.resolve(dxn, AccessToken.AccessToken);
          }),
      });
      yield* Database.Service.remove(token);

      if (json) {
        yield* Console.log(
          JSON.stringify(
            {
              removed: token.id,
              source: token.source,
              note: token.note,
            },
            null,
            2,
          ),
        );
      } else {
        yield* Console.log(print(printTokenRemoved(token.source)));
      }

      yield* flushAndSync();
    }),
).pipe(
  Command.withDescription('Remove an integration (OAuth token). Interactive if no id specified.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(AccessToken.AccessToken)),
);
