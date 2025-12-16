//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { DXN, Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { Function, Trigger, getUserFunctionIdInMetadata } from '@dxos/functions';

import { CommandConfig } from '../../../../services';
import { spaceLayer, withTypes } from '../../../../util';
import { Common } from '../../../options';
import { Enabled, Input, TriggerId } from '../options';
import { prettyPrintTrigger } from '../util';

import { Deep, Delay, Typename } from './options';

export const update = Command.make(
  'update',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: TriggerId,
    enabled: Enabled,
    functionId: Common.functionId.pipe(Options.optional),
    typename: Typename.pipe(Options.optional),
    deep: Deep.pipe(Options.optional),
    delay: Delay.pipe(Options.optional),
    input: Input.pipe(Options.optional),
  },
  ({ id, enabled, functionId, typename, deep, delay, input }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const dxn = DXN.fromLocalObjectId(id);
      const trigger = yield* Database.Service.resolve(dxn, Trigger.Trigger);
      if (trigger.spec?.kind !== 'subscription') {
        throw new Error('Trigger is not a subscription');
      }

      trigger.enabled = enabled;
      if (Option.isSome(typename)) {
        const queryAst = Query.select(Filter.type(typename.value)).ast;
        trigger.spec.query = {
          ast: queryAst,
        };
      }
      if (Option.isSome(deep) || Option.isSome(delay)) {
        trigger.spec.options = {
          ...trigger.spec.options,
          ...(Option.isSome(deep) ? { deep: deep.value } : {}),
          ...(Option.isSome(delay) ? { delay: delay.value } : {}),
        };
      }
      if (Option.isSome(input)) {
        trigger.input = input.value;
      }
      if (Option.isSome(functionId)) {
        const functions = yield* Database.Service.runQuery(Filter.type(Function.Function));
        const fn = functions.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === functionId.value);
        if (!fn) {
          throw new Error(`Function not found: ${functionId.value}`);
        }
        trigger.function = Ref.make(fn);
      }

      if (json) {
        yield* Console.log(JSON.stringify(trigger, null, 2));
      } else {
        yield* Console.log(yield* prettyPrintTrigger(trigger));
      }
    }),
).pipe(
  Command.withDescription('Update a subscription trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Function.Function, Trigger.Trigger)),
);
