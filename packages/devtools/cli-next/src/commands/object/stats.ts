import { Filter, Obj, Query } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { Command } from '@effect/cli';
import { Array, Console, Effect, pipe, Record } from 'effect';
import { withDatabase } from '../../util';
import { Common } from '../options';

export const stats = Command.make(
  'stats',
  {
    spaceId: Common.spaceId,
  },
  ({ spaceId }) =>
    Effect.gen(function* () {
      const { objects } = yield* DatabaseService.runQuery(Query.select(Filter.everything()));
      const stats = pipe(
        objects,
        Array.groupBy((obj) => Obj.getTypename(obj) ?? '<empty>'),
        Record.map((objs) => objs.length),
      );
      yield* Console.log(JSON.stringify(stats, null, 2));
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('Query objects.'));
