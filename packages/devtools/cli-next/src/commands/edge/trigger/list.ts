//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { Filter } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { Trigger } from '@dxos/functions';

import { spaceLayer } from '../../../util';
import { Common } from '../../options';

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  () =>
    Effect.gen(function* () {
      const triggers = yield* Database.Service.runQuery(Filter.type(Trigger.Trigger));
      yield* Console.log(JSON.stringify(triggers, null, 2));
    }),
).pipe(
  Command.withDescription('List triggers configured on EDGE.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId)),
);
