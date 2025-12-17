//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { DXN, Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import { Function, Trigger } from '@dxos/functions';

import { CommandConfig } from '../../../services';
import { flushAndSync, print, spaceLayer, withTypes } from '../../../util';
import { Common } from '../../options';
import { Cron, Enabled, Input, TriggerId } from '../options';
import { printTrigger, promptForSchemaInput, selectFunction, selectTrigger } from '../util';

export const timer = Command.make(
  'timer',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: TriggerId.pipe(Options.optional),
    enabled: Enabled,
    functionId: Common.functionId.pipe(Options.optional),
    cron: Cron.pipe(Options.optional),
    input: Input.pipe(Options.optional),
  },
  (options) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const triggerId = yield* Option.match(options.id, {
        onNone: () => selectTrigger('timer'),
        onSome: (id) => Effect.succeed(id),
      });
      const dxn = DXN.fromLocalObjectId(triggerId);
      const trigger = yield* Database.Service.resolve(dxn, Trigger.Trigger);
      if (!trigger.spec || trigger.spec?.kind !== 'timer') {
        return yield* Effect.fail(new Error(`Invalid trigger type: ${trigger.spec?.kind}`));
      }

      const currentFn = yield* updateFunction(trigger, options.functionId);
      yield* updateCron(trigger, options.cron);
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
  Command.withDescription('Update a timer trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Function.Function, Trigger.Trigger)),
);

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
    return yield* Effect.fail(new Error('Trigger has no function reference'));
  }

  return currentFn;
});

/**
 * Handles updating the cron expression for a timer trigger.
 * Prompts for confirmation if cron is not provided, then updates the cron if confirmed.
 */
const updateCron = Effect.fn(function* (trigger: Trigger.Trigger, cronOption: Option.Option<string>) {
  const currentCron = trigger.spec?.kind === 'timer' ? trigger.spec.cron : undefined;
  const shouldChangeCron = yield* Option.match(cronOption, {
    onNone: () =>
      Prompt.confirm({
        message: `Change the cron expression${currentCron ? ` (current: ${currentCron})` : ''}?`,
        initial: false,
      }).pipe(Prompt.run),
    onSome: () => Effect.succeed(true),
  });

  if (shouldChangeCron) {
    const cron = yield* Option.match(cronOption, {
      onNone: () =>
        Prompt.text({
          message: `Enter cron expression${currentCron ? ` (current: ${currentCron})` : ''}:`,
        }).pipe(Prompt.run),
      onSome: (value) => Effect.succeed(value),
    });
    if (trigger.spec?.kind === 'timer') {
      trigger.spec.cron = cron;
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
      Prompt.confirm({
        message: `Change the input (current: ${currentInputStr})?`,
        initial: false,
      }).pipe(Prompt.run),
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
