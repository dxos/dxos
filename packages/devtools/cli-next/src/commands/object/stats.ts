//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Array from 'effect/Array';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Record from 'effect/Record';

import { Filter, Obj, Query } from '@dxos/echo';
import { Database } from '@dxos/echo';

import { spaceLayer } from '../../util';
import { Common } from '../options';

export const stats = Command.make(
  'stats',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  () =>
    Effect.gen(function* () {
      const objects = yield* Database.Service.runQuery(Query.select(Filter.everything()));
      const stats = Function.pipe(
        objects,
        Array.groupBy((obj) => Obj.getTypename(obj) ?? '<empty>'),
        Record.map((objs) => objs.length),
      );
      yield* Console.log(JSON.stringify(stats, null, 2));
    }),
).pipe(
  Command.withDescription('Query objects.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId)),
);
