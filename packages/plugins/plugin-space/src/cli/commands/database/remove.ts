//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig, Common, print, spaceLayer } from '@dxos/cli-util';
import { Database, Filter, Query } from '@dxos/echo';

import { printObjectRemoved } from './util';

export const remove = Command.make(
  'remove',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    typename: Options.text('typename').pipe(Options.withDescription('The typename to query.'), Options.optional),
    id: Options.text('id').pipe(Options.withDescription('The object ID.'), Options.optional),
  },
  ({ typename, id }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      if (Option.isSome(id) && Option.isSome(typename)) {
        throw new Error('Cannot specify both typename and id');
      }
      let query: Query.Any;
      if (Option.isSome(id)) {
        query = Query.select(Filter.id(id.value));
      } else if (Option.isSome(typename)) {
        query = Query.select(Filter.typename(typename.value));
      } else {
        throw new Error('Must specify typename or id');
      }
      const objects = yield* Database.Service.runQuery(query);
      for (const object of objects) {
        yield* Database.Service.remove(object);
      }

      if (json) {
        yield* Console.log(JSON.stringify({ removed: objects.length }, null, 2));
      } else {
        yield* Console.log(print(printObjectRemoved(objects.length)));
      }
    }),
).pipe(
  Command.withDescription('Remove an object from a space.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
