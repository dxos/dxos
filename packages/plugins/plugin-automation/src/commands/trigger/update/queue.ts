//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { flushAndSync, print, spaceLayer, withTypes } from '@dxos/cli-util';
import { Common } from '@dxos/cli-util';
import { Operation, Trigger } from '@dxos/compute';
import { Database, Feed as FeedNs, Filter, JsonSchema, Obj, Ref } from '@dxos/echo';
import { EchoURI, type ObjectId } from '@dxos/keys';

import { Enabled, Feed, Input, TriggerId } from '../options';
import { printTrigger, promptForSchemaInput, selectFunction, selectFeed, selectTrigger } from '../util';

export const queue = Command.make(
  'feed',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: TriggerId.pipe(Options.optional),
    enabled: Enabled,
    functionId: Common.functionId.pipe(Options.optional),
    feed: Feed.pipe(Options.optional),
    input: Input.pipe(Options.optional),
  },
  (options) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const triggerId = yield* Option.match(options.id, {
        onNone: () => selectTrigger('feed'),
        onSome: (id) => Effect.succeed(id),
      });
      const dxn = EchoURI.make({ objectId: triggerId as ObjectId });
      const trigger = yield* Database.resolve(dxn, Trigger.Trigger);
      if (trigger.spec?.kind !== 'feed') {
        return yield* Effect.fail(new Error(`Invalid trigger type: ${trigger.spec?.kind}`));
      }

      const currentFn = yield* updateFunction(trigger, options.functionId);
      yield* updateFeed(trigger, options.feed);
      yield* updateInput(trigger, currentFn, options.input);
      yield* updateEnabled(trigger, options.id, options.enabled);

      if (json) {
        yield* Console.log(JSON.stringify(trigger, null, 2));
      } else {
        yield* Console.log(print(yield* printTrigger(trigger)));
      }

      yield* flushAndSync({ indexes: true });
    }),
).pipe(
  Command.withDescription('Update a feed trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Operation.PersistentOperation, Trigger.Trigger)),
);

/**
 * Handles updating the function for a trigger.
 * Prompts for confirmation if functionId is not provided, then updates the function if confirmed.
 * @returns The current function (either original or newly assigned)
 */
const updateFunction = Effect.fn(function* (trigger: Trigger.Trigger, functionIdOption: Option.Option<string>) {
  let currentFn: Operation.PersistentOperation | undefined = trigger.function
    ? yield* Database.load(trigger.function) as any
    : undefined;
  if (currentFn && !Obj.instanceOf(Operation.PersistentOperation, currentFn)) {
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
    const functions = yield* Database.runQuery(Filter.type(Operation.PersistentOperation));
    const foundFn = functions.find((fn) => fn.id === functionId);
    if (!foundFn || !Obj.instanceOf(Operation.PersistentOperation, foundFn)) {
      return yield* Effect.fail(new Error(`Function not found: ${functionId}`));
    }
    Obj.update(trigger, (trigger) => {
      trigger.function = Ref.make(foundFn);
    });
    currentFn = foundFn;
  }

  if (!currentFn) {
    const functionId = (trigger.function ? trigger.function.uri.toString() : undefined) ?? 'unknown';
    return yield* Effect.fail(new Error(`Invalid reference for ${functionId}`));
  }

  return currentFn;
});

/**
 * Handles updating the feed reference for a feed trigger.
 * Prompts for confirmation if feed is not provided, then updates the feed if confirmed.
 */
const updateFeed = Effect.fn(function* (trigger: Trigger.Trigger, feedOption: Option.Option<string>) {
  const currentFeed = trigger.spec?.kind === 'feed' ? trigger.spec.feed : undefined;
  const currentFeedStr = currentFeed ? currentFeed.uri.toString() : undefined;
  const shouldChangeFeed = yield* Option.match(feedOption, {
    onNone: () =>
      Prompt.confirm({
        message: `Change the feed${currentFeedStr ? ` (current: ${currentFeedStr})` : ''}?`,
        initial: false,
      }).pipe(Prompt.run),
    onSome: () => Effect.succeed(true),
  });
  if (shouldChangeFeed) {
    const feed = yield* Option.match(feedOption, {
      onNone: () => selectFeed(),
      onSome: (uri) => Database.resolve(EchoURI.parse(uri), FeedNs.Feed),
    });
    Obj.update(trigger, (trigger) => {
      if (trigger.spec?.kind === 'feed') {
        trigger.spec.feed = Ref.make(feed);
      }
    });
  }
});

/**
 * Handles updating the input for a trigger.
 * Prompts for confirmation if input is not provided, then updates the input if confirmed.
 */
const updateInput = Effect.fn(function* (
  trigger: Trigger.Trigger,
  fn: Operation.PersistentOperation,
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
        promptForSchemaInput(fn.inputSchema ? JsonSchema.toEffectSchema(fn.inputSchema) : undefined, currentInput),
      onSome: (value) => Effect.succeed(value as Record<string, any>),
    });
    Obj.update(trigger, (trigger) => {
      trigger.input = inputObj;
    });
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
  const enabledValue = yield* Option.match(idOption, {
    onNone: () =>
      Prompt.confirm({
        message: 'Enable the trigger?',
        initial: trigger.enabled,
      }).pipe(Prompt.run),
    onSome: () => Effect.succeed(enabled),
  });
  Obj.update(trigger, (trigger) => {
    trigger.enabled = enabledValue;
  });
});
