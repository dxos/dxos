//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as HashMap from 'effect/HashMap';
import * as Option from 'effect/Option';

import { Database, Filter, Query, Ref, Type } from '@dxos/echo';
import { Function, Trigger } from '@dxos/functions';

import { CommandConfig } from '../../../../services';
import { print, spaceLayer, withTypes } from '../../../../util';
import { Common } from '../../../options';
import { Deep, Delay, Enabled, Input, Typename } from '../options';
import { printTrigger, promptForSchemaInput, selectFunction } from '../util';

export const subscription = Command.make(
  'subscription',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    enabled: Enabled,
    functionId: Common.functionId.pipe(Options.optional),
    typename: Typename.pipe(Options.optional),
    deep: Deep.pipe(Options.optional),
    delay: Delay.pipe(Options.optional),
    input: Input.pipe(Options.optional),
  },
  (options) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const functionId = yield* Option.match(options.functionId, {
        onNone: () => selectFunction(),
        onSome: (id) => Effect.succeed(id),
      });
      const functions = yield* Database.Service.runQuery(Filter.type(Function.Function));
      const fn = functions.find((fn) => fn.id === functionId);
      if (!fn) {
        return yield* Effect.fail(new Error(`Function not found: ${functionId}`));
      }

      const typename = yield* Option.match(options.typename, {
        onNone: () =>
          Prompt.text({
            message: 'Enter type name:',
          }).pipe(Prompt.run),
        onSome: (value) => Effect.succeed(value),
      });
      const queryAst = Query.select(Filter.type(typename)).ast;

      const deepOption = yield* Option.match(options.deep, {
        onNone: () =>
          Prompt.confirm({
            message: 'Watch changes to nested properties (deep)?',
            initial: false,
          }).pipe(
            Prompt.run,
            Effect.map((value) => (value ? Option.some(value) : Option.none())),
          ),
        onSome: () => Effect.succeed(Option.some(true)),
      });

      const delayOption = yield* Option.match(options.delay, {
        onNone: () =>
          Effect.gen(function* () {
            const delayStr = yield* Prompt.text({
              message: 'Debounce delay in milliseconds (optional, press Enter to skip):',
            }).pipe(Prompt.run);
            return delayStr === '' ? Option.none<number>() : Option.some(parseInt(delayStr, 10));
          }),
        onSome: (value) => Effect.succeed(Option.some(value)),
      });

      const subscriptionOptions: { deep?: boolean; delay?: number } = {};
      if (Option.isSome(deepOption)) {
        subscriptionOptions.deep = deepOption.value;
      }
      if (Option.isSome(delayOption)) {
        subscriptionOptions.delay = delayOption.value;
      }

      const input = yield* Option.match(options.input, {
        onNone: () => promptForSchemaInput(fn.inputSchema ? Type.toEffectSchema(fn.inputSchema) : undefined),
        onSome: (value) => Effect.succeed(Object.fromEntries(HashMap.toEntries(value))),
      });

      // Always prompt for enabled if functionId is not provided.
      const enabled = yield* Option.match(options.functionId, {
        onNone: () =>
          Prompt.confirm({
            message: 'Enable the trigger?',
            initial: true,
          }).pipe(Prompt.run),
        onSome: () => Effect.succeed(options.enabled),
      });

      const trigger = Trigger.make({
        function: Ref.make(fn),
        enabled,
        spec: {
          kind: 'subscription',
          query: {
            ast: queryAst,
          },
          options: Object.keys(subscriptionOptions).length > 0 ? subscriptionOptions : undefined,
        },
        input,
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
