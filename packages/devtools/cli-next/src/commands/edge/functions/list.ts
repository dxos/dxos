//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import { Filter } from '@dxos/echo';
import { DatabaseService, Function } from '@dxos/functions';

import { withDatabase } from '../../../util';
import { Common } from '../../options';

export const list = Command.make('list', { spaceId: Common.spaceId }, ({ spaceId }) =>
  Effect.gen(function* () {
    const objects = yield* DatabaseService.query(Filter.type(Function.Function)).run; // note that no destructuring is require
    console.log(JSON.stringify(objects, null, 2));
  }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('List functions deployed to EDGE.'));
