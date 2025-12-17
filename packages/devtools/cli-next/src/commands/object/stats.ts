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

import { CommandConfig } from '../../services';
import { printList, spaceLayer } from '../../util';
import { Common } from '../options';

import { printStats } from './util';

export const stats = Command.make(
  'stats',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  () =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const objects = yield* Database.Service.runQuery(Query.select(Filter.everything()));
      const stats = Function.pipe(
        objects,
        Array.groupBy((obj) => Obj.getTypename(obj) ?? '<empty>'),
        Record.map((objs) => objs.length),
      );

      if (json) {
        yield* Console.log(JSON.stringify(stats, null, 2));
      } else {
        const formatted = Record.toEntries(stats).map(([typename, count]) => printStats(typename, count));
        yield* Console.log(printList(formatted));
      }
    }),
).pipe(
  Command.withDescription('Query objects.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId)),
);
