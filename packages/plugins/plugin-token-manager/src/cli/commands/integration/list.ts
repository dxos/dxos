//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, Common, printList, spaceLayer, withTypes } from '@dxos/cli-util';
import { Filter } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

import { printToken } from './util';

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  () =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const filter = Filter.type(AccessToken.AccessToken);
      const tokens = yield* Database.Service.runQuery(filter);

      if (json) {
        // Exclude token values from JSON output for security
        const safeTokens = tokens.map((token) => ({
          id: token.id,
          source: token.source,
          note: token.note,
        }));
        yield* Console.log(JSON.stringify(safeTokens, null, 2));
      } else {
        const formatted = tokens.map(printToken);
        yield* Console.log(printList(formatted));
      }
    }),
).pipe(
  Command.withDescription('List all integrations (OAuth tokens).'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(AccessToken.AccessToken)),
);
