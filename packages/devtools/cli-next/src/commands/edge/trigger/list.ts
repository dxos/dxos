//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { Filter } from '@dxos/echo';
import { withDatabase } from '../../../util';
import { Common } from '../../options';
import { Trigger } from "@dxos/functions";
import { DatabaseService } from "@dxos/echo-db";

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId,
  },
  ({ spaceId }) =>
    Effect.gen(function* () {
      const { objects: triggers } = yield* DatabaseService.runQuery(Filter.type(Trigger.Trigger));
      yield* Console.log(JSON.stringify(triggers, null, 2));
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('List triggers configured on EDGE.'));
