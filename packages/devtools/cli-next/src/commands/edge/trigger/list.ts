//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';
import { colorize } from 'json-colorizer';

import { Filter } from '@dxos/echo';
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
      yield* Console.log(colorize(triggers));
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('List functions deployed to EDGE.'));
