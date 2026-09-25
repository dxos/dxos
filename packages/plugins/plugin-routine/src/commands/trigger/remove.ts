//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig, Common, print, spaceLayer, withTypes } from '@dxos/cli-util';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { TriggerId } from './options.ts';
import { printTriggerRemoved, selectTrigger } from './util.ts';

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
      const dxn = EID.make({ entityId: triggerId });
      const trigger = yield* Database.resolve(Ref.fromURI(dxn), Trigger.Trigger);
      yield* Database.remove(trigger);
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
