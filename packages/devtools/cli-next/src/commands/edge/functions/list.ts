//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import * as Effect from 'effect/Effect';

import { Filter } from '@dxos/echo';
import { DatabaseService, FunctionType } from '@dxos/functions';

import { withDatabase } from '../../../util';
import { Common } from '../../options';

export const list = Command.make('list', { spaceId: Common.spaceId }, ({ spaceId }) =>
  Effect.gen(function* () {
    const { objects: functions } = yield* DatabaseService.runQuery(Filter.type(FunctionType));
    console.log(JSON.stringify(functions, null, 2));
  }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('List functions deployed to EDGE.'));
