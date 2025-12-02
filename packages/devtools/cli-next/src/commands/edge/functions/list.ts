//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import { Filter } from '@dxos/echo';
import { DatabaseService } from '@dxos/echo-db';
import { Function } from '@dxos/functions';

import { withDatabase } from '../../../util';
import { Common } from '../../options';

export const list = Command.make('list', { spaceId: Common.spaceId }, ({ spaceId }) =>
  Effect.gen(function* () {
    const functions = yield* DatabaseService.runQuery(Filter.type(Function.Function));
    console.log(JSON.stringify(functions, null, 2));
  }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('List functions deployed to EDGE.'));
