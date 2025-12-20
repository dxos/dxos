//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { DXN } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { Trigger } from '@dxos/functions';

import { CommandConfig } from '../../services';
import { print, spaceLayer, withTypes } from '../../util';
import { Common } from '../options';

import { TriggerId } from './options';
import { printTriggerRemoved, selectTrigger } from './util';

export const remove = Command.make(
  'remove',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: TriggerId.pipe(Options.optional),
  },
  (options) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const triggerId = yield* Option.match(options.id, {
        onNone: () => selectTrigger(),
        onSome: (id) => Effect.succeed(id),
      });
      const dxn = DXN.fromLocalObjectId(triggerId);
      const trigger = yield* Database.Service.resolve(dxn, Trigger.Trigger);
      yield* Database.Service.remove(trigger);
      if (json) {
        yield* Console.log(JSON.stringify({ id: trigger.id, removed: true }, null, 2));
      } else {
        yield* Console.log(print(printTriggerRemoved(trigger.id)));
      }
    }),
).pipe(
  Command.withDescription('Remove a trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Trigger.Trigger)),
);
