//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { Database, Filter } from '@dxos/echo';
import { Trigger } from '@dxos/functions';

import { CommandConfig } from '../../../services';
import { spaceLayer } from '../../../util';
import { Common } from '../../options';

import { printTrigger } from './util';

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  Effect.fn(function* () {
    const { json } = yield* CommandConfig;
    const triggers = yield* Database.Service.runQuery(Filter.type(Trigger.Trigger));

    if (json) {
      yield* Console.log(JSON.stringify(triggers, null, 2));
    } else {
      if (triggers.length === 0) {
        yield* Console.log('No triggers found.');
      } else {
        for (const trigger of triggers) {
          yield* Console.log(yield* printTrigger(trigger));
          yield* Console.log('');
        }
      }
    }
  }),
).pipe(
  Command.withDescription('List triggers configured on EDGE.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
