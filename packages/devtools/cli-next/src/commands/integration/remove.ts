//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Filter, Query } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

import { CommandConfig } from '../../services';
import { flushAndSync, print, spaceLayer } from '../../util';
import { Common } from '../options';

import { printTokenRemoved } from './util';

export const remove = Command.make(
  'remove',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: Options.text('id').pipe(Options.withDescription('The token ID.'), Options.optional),
  },
  ({ spaceId, id }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      let tokenId: string;

      if (Option.isSome(id)) {
        tokenId = id.value;
      } else {
        // Interactive mode: show list of tokens and let user select
        const filter = Filter.type(AccessToken.AccessToken);
        const tokens = yield* Database.Service.runQuery(filter);

        if (tokens.length === 0) {
          return yield* Effect.fail(new Error('No tokens found to remove'));
        }

        const choices = tokens.map((token) => ({
          title: `${token.note || token.source} (${token.source})`,
          value: token.id,
        }));

        tokenId = yield* Prompt.select({
          message: 'Select token to remove:',
          choices,
        }).pipe(Prompt.run);
      }

      // Find and remove the single token
      const query = Query.select(Filter.id(tokenId));
      const tokens = yield* Database.Service.runQuery(query);

      if (tokens.length === 0) {
        return yield* Effect.fail(new Error(`Token not found: ${tokenId}`));
      }

      if (tokens.length > 1) {
        return yield* Effect.fail(new Error(`Multiple tokens found with id: ${tokenId}`));
      }

      const token = tokens[0];
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
);
