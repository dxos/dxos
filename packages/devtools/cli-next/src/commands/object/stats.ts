//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import * as Array from 'effect/Array';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Record from 'effect/Record';

import { Filter, Obj, Query } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';

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
      const stats = Function.pipe(
        objects,
        Array.groupBy((obj) => Obj.getTypename(obj) ?? '<empty>'),
        Record.map((objs) => objs.length),
      );
      yield* Console.log(JSON.stringify(stats, null, 2));
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('Query objects.'));
