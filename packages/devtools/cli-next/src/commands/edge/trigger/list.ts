//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';

import { Filter, Obj } from '@dxos/echo';
import { DatabaseService, FunctionTrigger } from '@dxos/functions';

import { withDatabase } from '../../../util';
import { Common } from '../../options';

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId,
  },
  ({ spaceId }) =>
    Effect.gen(function* () {
      const { objects: triggers } = yield* DatabaseService.runQuery(Filter.type(FunctionTrigger));
      yield* Console.log(JSON.stringify(triggers, null, 2));
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('List functions deployed to EDGE.'));
