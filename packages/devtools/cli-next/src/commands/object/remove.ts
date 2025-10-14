//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Options } from '@effect/cli';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Filter, Query } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';

import { withDatabase } from '../../util';
import { Common } from '../options';

export const remove = Command.make(
  'remove',
  {
    spaceId: Common.spaceId,
    typename: Options.text('typename').pipe(Options.withDescription('The typename to query.'), Options.optional),
    id: Options.text('id').pipe(Options.withDescription('The object ID.'), Options.optional),
  },
  ({ spaceId, typename, id }) =>
    Effect.gen(function* () {
      if (Option.isSome(id) && Option.isSome(typename)) {
        throw new Error('Cannot specify both typename and id');
      }
      let query: Query<any>;
      if (Option.isSome(id)) {
        query = Query.select(Filter.ids(id.value));
      } else if (Option.isSome(typename)) {
        query = Query.select(Filter.typename(typename.value));
      } else {
        throw new Error('Must specify typename or id');
      }
      const objects = yield* DatabaseService.runQuery(query);
      for (const object of objects.objects) {
        yield* DatabaseService.remove(object);
      }

      yield* Console.log(`Removed ${objects.objects.length} objects.`);
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('Remove an object from a space.'));
