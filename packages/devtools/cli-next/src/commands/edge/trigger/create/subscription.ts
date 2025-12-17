//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as HashMap from 'effect/HashMap';
import * as Option from 'effect/Option';

import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { Function, Trigger, getUserFunctionIdInMetadata } from '@dxos/functions';

import { CommandConfig } from '../../../../services';
import { print, spaceLayer, withTypes } from '../../../../util';
import { Common } from '../../../options';
import { Deep, Delay, Enabled, Input, Typename } from '../options';
import { printTrigger } from '../util';

export const subscription = Command.make(
  'subscription',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    enabled: Enabled,
    // TODO(dmaretskyi): Should be the ECHO id of the function
    functionId: Common.functionId,
    typename: Typename,
    deep: Deep.pipe(Options.optional),
    delay: Delay.pipe(Options.optional),
    input: Input.pipe(Options.withDefault(HashMap.empty())),
  },
  ({ enabled, functionId, typename, deep, delay, input }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const functions = yield* Database.Service.runQuery(Filter.type(Function.Function));
      const fn = functions.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === functionId);
      if (!fn) {
        throw new Error(`Function not found: ${functionId}`);
      }

      const queryAst = Query.select(Filter.type(typename)).ast;

      const options: { deep?: boolean; delay?: number } = {};
      if (Option.isSome(deep)) {
        options.deep = deep.value;
      }
      if (Option.isSome(delay)) {
        options.delay = delay.value;
      }

      const trigger = Trigger.make({
        function: Ref.make(fn),
        enabled,
        spec: {
          kind: 'subscription',
          query: {
            ast: queryAst,
          },
          options: Object.keys(options).length > 0 ? options : undefined,
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
  Command.withDescription('Create a subscription trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Function.Function, Trigger.Trigger)),
);
