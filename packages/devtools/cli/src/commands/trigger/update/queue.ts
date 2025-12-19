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
import { flushAndSync, print, spaceLayer, types, withTypes } from '../../../util';
import { Common } from '../../options';
import { Enabled, Input, Queue, TriggerId } from '../options';
import { printTrigger, promptForSchemaInput, selectFunction, selectQueue, selectTrigger } from '../util';

export const queue = Command.make(
  'queue',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: TriggerId.pipe(Options.optional),
    enabled: Enabled,
    functionId: Common.functionId.pipe(Options.optional),
    queue: Queue.pipe(Options.optional),
    input: Input.pipe(Options.optional),
  },
  (options) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const triggerId = yield* Option.match(options.id, {
        onNone: () => selectTrigger('queue'),
        onSome: (id) => Effect.succeed(id),
      });
      const dxn = DXN.fromLocalObjectId(triggerId);
      const trigger = yield* Database.Service.resolve(dxn, Trigger.Trigger);
      if (trigger.spec?.kind !== 'queue') {
        return yield* Effect.fail(new Error(`Invalid trigger type: ${trigger.spec?.kind}`));
      }

      const currentFn = yield* updateFunction(trigger, options.functionId);
      yield* updateQueue(trigger, options.queue);
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
  Command.withDescription('Update a queue trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Function.Function, Trigger.Trigger, ...types)),
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
    const functionId = trigger.function?.dxn.asEchoDXN()?.echoId ?? 'unknown';
    return yield* Effect.fail(new Error(`Invalid reference for ${functionId}`));
  }

  return currentFn;
});

/**
 * Handles updating the queue DXN for a queue trigger.
 * Prompts for confirmation if queue is not provided, then updates the queue if confirmed.
 */
const updateQueue = Effect.fn(function* (trigger: Trigger.Trigger, queueOption: Option.Option<DXN>) {
  const currentQueue = trigger.spec?.kind === 'queue' ? trigger.spec.queue : undefined;
  const currentQueueStr = currentQueue
    ? typeof currentQueue === 'string'
      ? currentQueue
      : String(currentQueue)
    : undefined;
  const shouldChangeQueue = yield* Option.match(queueOption, {
    onNone: () =>
      Prompt.confirm({
        message: `Change the queue${currentQueueStr ? ` (current: ${currentQueueStr})` : ''}?`,
        initial: false,
      }).pipe(Prompt.run),
    onSome: () => Effect.succeed(true),
  });
  if (shouldChangeQueue) {
    const queueDxn = yield* Option.match(queueOption, {
      onNone: () => selectQueue(),
      onSome: (dxn) => Effect.succeed(dxn.toString()),
    });
    if (trigger.spec?.kind === 'queue') {
      trigger.spec.queue = queueDxn;
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
