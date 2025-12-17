//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as HashMap from 'effect/HashMap';

import { Database, Filter, Ref } from '@dxos/echo';
import { Function, Trigger } from '@dxos/functions';

import { CommandConfig } from '../../../../services';
import { print, spaceLayer, withTypes } from '../../../../util';
import { Common } from '../../../options';
import { Cron, Enabled, Input } from '../options';
import { printTrigger } from '../util';

// trigger create timer --cron "0 0 * * *" --functionId <functionId>
export const timer = Command.make(
  'timer',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    enabled: Enabled,
    functionId: Common.functionId,
    cron: Cron,
    input: Input.pipe(Options.withDefault(HashMap.empty())),
  },
  ({ enabled, functionId, cron, input }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const functions = yield* Database.Service.runQuery(Filter.type(Function.Function));
      const fn = functions.find((fn) => fn.id === functionId);
      if (!fn) {
        throw new Error(`Function not found: ${functionId}`);
      }

      const trigger = Trigger.make({
        function: Ref.make(fn),
        enabled,
        spec: {
          kind: 'timer',
          cron,
        },
        input: Object.fromEntries(HashMap.toEntries(input)),
      });

      yield* Database.Service.add(trigger);

      if (json) {
        yield* Console.log(JSON.stringify(trigger, null, 2));
      } else {
        yield* Console.log(print(yield* printTrigger(trigger)));
      }
    }),
).pipe(
  Command.withDescription('Create a timer trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Function.Function, Trigger.Trigger)),
);
