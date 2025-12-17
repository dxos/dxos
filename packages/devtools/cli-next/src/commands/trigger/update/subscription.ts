//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { DXN, Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { Function, Trigger } from '@dxos/functions';

import { CommandConfig } from '../../../services';
import { flushAndSync, print, spaceLayer, withTypes } from '../../../util';
import { Common } from '../../options';
import { Deep, Delay, Enabled, Input, TriggerId, Typename } from '../options';
import { printTrigger, promptForSchemaInput, selectFunction, selectTrigger } from '../util';

export const subscription = Command.make(
  'subscription',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: TriggerId.pipe(Options.optional),
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

      const triggerId = yield* Option.match(options.id, {
        onNone: () => selectTrigger('subscription'),
        onSome: (id) => Effect.succeed(id),
      });
      const dxn = DXN.fromLocalObjectId(triggerId);
      const trigger = yield* Database.Service.resolve(dxn, Trigger.Trigger);
      if (trigger.spec?.kind !== 'subscription') {
        return yield* Effect.fail(new Error(`Invalid trigger type: ${trigger.spec?.kind}`));
      }

      const currentFn = yield* updateFunction(trigger, options.functionId);
      yield* updateSpec(trigger, options.typename, options.deep, options.delay);
      yield* updateInput(trigger, currentFn, options.input);
      trigger.enabled = yield* updateEnabled(trigger, options.id, options.enabled);

      if (json) {
        yield* Console.log(JSON.stringify(trigger, null, 2));
      } else {
        yield* Console.log(print(yield* printTrigger(trigger)));
      }

      yield* flushAndSync({ indexes: true });
    }),
).pipe(
  Command.withDescription('Update a subscription trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Function.Function, Trigger.Trigger)),
);

/**
 * Extracts the current typename from a subscription trigger's query AST.
 */
const extractCurrentTypename = (spec: Trigger.SubscriptionSpec | undefined): Option.Option<string> => {
  if (!spec?.query?.ast) {
    return Option.none();
  }
  return Match.value(spec.query.ast).pipe(
    Match.withReturnType<Option.Option<string>>(),
    Match.when({ type: 'select' }, (q) =>
      Match.value(q.filter).pipe(
        Match.withReturnType<Option.Option<string>>(),
        Match.when({ type: 'object' }, (f) =>
          Option.fromNullable(f.typename).pipe(
            Option.flatMap((dxn) => Option.fromNullable(DXN.tryParse(dxn))),
            Option.flatMap((dxn) => Option.fromNullable(dxn.asTypeDXN()?.type)),
          ),
        ),
        Match.orElse(() => Option.none()),
      ),
    ),
    Match.orElse(() => Option.none()),
  );
};

/**
 * Handles updating the function for a trigger.
 * Prompts for confirmation if functionId is not provided, then updates the function if confirmed.
 * @returns The current function (either original or newly assigned)
 */
const updateFunction = Effect.fn(function* (trigger: Trigger.Trigger, functionIdOption: Option.Option<string>) {
  let currentFn: Function.Function | undefined = trigger.function
    ? yield* Database.Service.load(trigger.function) as any
    : undefined;
  if (currentFn && !Obj.instanceOf(Function.Function, currentFn)) {
    currentFn = undefined;
  }
  const currentFunctionName = currentFn ? (currentFn.name ?? currentFn.id) : undefined;
  const shouldChangeFunction = yield* Option.match(functionIdOption, {
    onNone: () =>
      Prompt.confirm({
        message: `Change the function${currentFunctionName ? ` (current: ${currentFunctionName})` : ''}?`,
        initial: false,
      }).pipe(Prompt.run),
    onSome: () => Effect.succeed(true),
  });
  if (shouldChangeFunction) {
    const functionId = yield* Option.match(functionIdOption, {
      onNone: () => selectFunction(),
      onSome: (id) => Effect.succeed(id),
    });
    const functions = yield* Database.Service.runQuery(Filter.type(Function.Function));
    const foundFn = functions.find((fn) => fn.id === functionId);
    if (!foundFn || !Obj.instanceOf(Function.Function, foundFn)) {
      return yield* Effect.fail(new Error(`Function not found: ${functionId}`));
    }
    currentFn = foundFn;
    trigger.function = Ref.make(currentFn);
  }

  if (!currentFn) {
    const functionId = trigger.function?.dxn.asEchoDXN()?.echoId ?? 'unknown';
    return yield* Effect.fail(new Error(`Invalid reference for ${functionId}`));
  }

  return currentFn;
});

/**
 * Handles updating the subscription trigger spec (typename, deep, delay).
 * Prompts for confirmation if no spec options are provided, then updates the spec if confirmed.
 */
const updateSpec = Effect.fn(function* (
  trigger: Trigger.Trigger,
  typenameOption: Option.Option<string>,
  deepOption: Option.Option<boolean>,
  delayOption: Option.Option<number>,
) {
  const currentSpec = trigger.spec?.kind === 'subscription' ? trigger.spec : undefined;
  const currentTypename = extractCurrentTypename(currentSpec);
  const currentTypenameStr = Option.getOrUndefined(currentTypename);
  const currentDeep = currentSpec?.options?.deep;
  const currentDelay = currentSpec?.options?.delay;
  const specParts: string[] = [];
  if (currentTypenameStr) {
    specParts.push(`typename: ${currentTypenameStr}`);
  }
  if (currentDeep !== undefined) {
    specParts.push(`deep: ${currentDeep}`);
  }
  if (currentDelay !== undefined) {
    specParts.push(`delay: ${currentDelay}`);
  }
  const currentSpecStr = specParts.length > 0 ? specParts.join(', ') : 'none';

  const hasSpecOption = Option.isSome(typenameOption) || Option.isSome(deepOption) || Option.isSome(delayOption);
  const shouldChangeSpec = yield* hasSpecOption
    ? Effect.succeed(true)
    : Prompt.confirm({
        message: `Change the trigger spec (current: ${currentSpecStr})?`,
        initial: false,
      }).pipe(Prompt.run);
  if (shouldChangeSpec) {
    const typename = yield* Option.match(typenameOption, {
      onNone: () =>
        Prompt.text({
          message: `Enter type name${currentTypenameStr ? ` (current: ${currentTypenameStr})` : ''}:`,
        }).pipe(Prompt.run),
      onSome: (value) => Effect.succeed(value),
    });
    const queryAst = Query.select(Filter.type(typename)).ast;
    if (trigger.spec?.kind === 'subscription') {
      trigger.spec.query = {
        ast: queryAst,
      };
    }

    const deepOptionValue = yield* Option.match(deepOption, {
      onNone: () =>
        Prompt.confirm({
          message: 'Watch changes to nested properties (deep)?',
          initial: currentSpec?.options?.deep ?? false,
        }).pipe(
          Prompt.run,
          Effect.map((value) => (value ? Option.some(value) : Option.none())),
        ),
      onSome: () => Effect.succeed(Option.some(true)),
    });

    const delayOptionValue = yield* Option.match(delayOption, {
      onNone: () =>
        Effect.gen(function* () {
          const currentDelay = currentSpec?.options?.delay;
          const delayStr = yield* Prompt.text({
            message: `Debounce delay in milliseconds (optional, press Enter to skip)${currentDelay ? ` (current: ${currentDelay})` : ''}:`,
          }).pipe(Prompt.run);
          return delayStr === '' ? Option.none<number>() : Option.some(parseInt(delayStr, 10));
        }),
      onSome: (value) => Effect.succeed(Option.some(value)),
    });

    const subscriptionOptions: { deep?: boolean; delay?: number } = {};
    if (Option.isSome(deepOptionValue)) {
      subscriptionOptions.deep = deepOptionValue.value;
    }
    if (Option.isSome(delayOptionValue)) {
      subscriptionOptions.delay = delayOptionValue.value;
    }
    if (trigger.spec?.kind === 'subscription') {
      trigger.spec.options = Object.keys(subscriptionOptions).length > 0 ? subscriptionOptions : undefined;
    }
  }
});

/**
 * Handles updating the input for a trigger.
 * Prompts for confirmation if input is not provided, then updates the input if confirmed.
 */
const updateInput = Effect.fn(function* (
  trigger: Trigger.Trigger,
  fn: Function.Function,
  inputOption: Option.Option<Record<string, any>>,
) {
  const currentInput = trigger.input as Record<string, any> | undefined;
  const currentInputStr = currentInput ? JSON.stringify(currentInput) : 'none';
  const shouldChangeInput = yield* Option.match(inputOption, {
    onNone: () =>
      Effect.gen(function* () {
        yield* Console.log(`Current input: ${currentInputStr}`);
        return yield* Prompt.confirm({
          message: 'Change input?',
          initial: false,
        }).pipe(Prompt.run);
      }),
    onSome: () => Effect.succeed(true),
  });
  if (shouldChangeInput) {
    const inputObj = yield* Option.match(inputOption, {
      onNone: () =>
        promptForSchemaInput(fn.inputSchema ? Type.toEffectSchema(fn.inputSchema) : undefined, currentInput),
      onSome: (value) => Effect.succeed(value as Record<string, any>),
    });
    trigger.input = inputObj as any;
  }
});

/**
 * Handles updating the enabled status for a trigger.
 * Prompts for enabled if id is not provided.
 */
const updateEnabled = Effect.fn(function* (
  trigger: Trigger.Trigger,
  idOption: Option.Option<string>,
  enabled: boolean,
) {
  return yield* Option.match(idOption, {
    onNone: () =>
      Prompt.confirm({
        message: 'Enable the trigger?',
        initial: trigger.enabled,
      }).pipe(Prompt.run),
    onSome: () => Effect.succeed(enabled),
  });
});
