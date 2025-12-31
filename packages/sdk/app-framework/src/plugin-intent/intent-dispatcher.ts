//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Ref from 'effect/Ref';
import type * as Types from 'effect/Types';

import { runAndForwardErrors } from '@dxos/effect';
import { live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type GuardedType, type MaybePromise, type Position, byPosition } from '@dxos/util';

import * as Common from '../common';
import { Capability } from '../core';

import { IntentAction } from './actions';
import { CycleDetectedError, NoResolversError } from './errors';
import {
  type AnyIntent,
  type Intent,
  type IntentData,
  type IntentProps,
  type IntentResultData,
  type IntentSchema,
  type Label,
  createIntent,
} from './intent';

const EXECUTION_LIMIT = 100;
const HISTORY_LIMIT = 100;

/**
 * The return value of an intent effect.
 */
export type IntentEffectResult<Input, Output> = {
  /**
   * The output of the action that was performed.
   */
  data?: Output;

  /**
   * If provided, the action will be undoable.
   */
  undoable?: {
    /**
     * Message to display to the user when indicating that the action can be undone.
     */
    message: Label;

    /**
     * Will be merged with the original intent data when firing the undo intent.
     */
    data?: Partial<Input>;
  };

  /**
   * An error that occurred while performing the action.
   *
   * Return caught error instead of throwing to trigger other intents to be triggered prior to returning the error.
   */
  error?: Error;

  /**
   * Other intents to be triggered as follow-ups.
   */
  intents?: AnyIntent[];
};

export type AnyIntentEffectResult = IntentEffectResult<any, any>;

/**
 * The result of an intent dispatcher.
 */
export type IntentDispatcherResult<Input, Output> = Pick<IntentEffectResult<Input, Output>, 'data' | 'error'>;

/**
 * The implementation of an intent effect.
 */
export type IntentEffectDefinition<Input, Output> = (
  data: Input,
  undo: boolean,
) =>
  | MaybePromise<IntentEffectResult<Input, Output> | void>
  | Effect.Effect<IntentEffectResult<Input, Output> | void, Error>;

/**
 * Intent resolver to match intents to their effects.
 */
export type IntentResolver<Tag extends string, Fields extends IntentProps, Data = IntentData<Fields>> = Readonly<{
  /**
   * The schema of the intent to be resolved.
   */
  intent: IntentSchema<Tag, Fields>;

  /**
   * Hint to determine the order the resolvers are processed if multiple resolvers are defined for the same intent.
   * Only one resolver will be used.
   */
  position?: Position;

  /**
   * Optional filter to determine if the resolver should be used.
   */
  filter?: (data: IntentData<Fields>) => data is Data;

  /**
   * The effect to be performed when the intent is resolved.
   */
  resolve: IntentEffectDefinition<GuardedType<IntentResolver<Tag, Fields, Data>['filter']>, IntentResultData<Fields>>;
}>;

export type AnyIntentResolver = IntentResolver<any, any, any>;

/**
 * Creates an intent resolver to match intents to their effects.
 * @param schema Schema of the intent. Must be a tagged class with input and output schemas.
 * @param effect Effect to be performed when the intent is resolved.
 * @param params.disposition Determines the priority of the resolver when multiple are resolved.
 * @param params.filter Optional filter to determine if the resolver should be used.
 */
export const createResolver = <Tag extends string, Fields extends IntentProps, Data = IntentData<Fields>>(
  resolver: IntentResolver<Tag, Fields, Data>,
) => resolver;

/**
 * Invokes intents and returns the result.
 */
export type PromiseIntentDispatcher = <Fields extends IntentProps>(
  intent: Intent<any, Fields>,
) => Promise<Types.Simplify<IntentDispatcherResult<IntentData<Fields>, IntentResultData<Fields>>>>;

/**
 * Creates an effect for intents.
 */
export type IntentDispatcher = <Fields extends IntentProps>(
  intent: Intent<any, Fields>,
  depth?: number,
) => Effect.Effect<
  Types.Simplify<Required<IntentDispatcherResult<IntentData<Fields>, IntentResultData<Fields>>>['data']>,
  Error
>;

type IntentResult<Tag extends string, Fields extends IntentProps> = IntentEffectResult<
  IntentData<Fields>,
  IntentResultData<Fields>
> & {
  _intent: Intent<Tag, Fields>;
};

export type AnyIntentResult = IntentResult<any, any>;

/**
 * Invokes the most recent undoable intent with undo flags.
 */
export type PromiseIntentUndo = () => Promise<IntentDispatcherResult<any, any>>;

/**
 * Creates an effect which undoes the last intent.
 */
export type IntentUndo = () => Effect.Effect<any, Error>;

/**
 * Check if an intent result is undoable.
 */
const isUndoable = (result: AnyIntentResult): boolean => !!result.undoable;

export type IntentContext = {
  dispatch: IntentDispatcher;
  dispatchPromise: PromiseIntentDispatcher;
  undo: IntentUndo;
  undoPromise: PromiseIntentUndo;
};

/**
 * Sets up an intent dispatcher.
 *
 * @param getResolvers A function that returns an array of available intent resolvers.
 * @param params.historyLimit The maximum number of intent results to keep in history.
 * @param params.executionLimit The maximum recursion depth for follow-up intents.
 */
export const createDispatcher = (
  getResolvers: () => AnyIntentResolver[],
  { executionLimit = EXECUTION_LIMIT, historyLimit = HISTORY_LIMIT } = {},
): IntentContext => {
  const historyRef = Effect.runSync(Ref.make<AnyIntentResult[]>([]));

  const handleIntent = (intent: AnyIntent) =>
    Effect.gen(function* () {
      const candidates = getResolvers()
        .filter((resolver) => resolver.intent._tag === intent.id)
        .filter((resolver) => !resolver.filter || resolver.filter(intent.data))
        .toSorted(byPosition);
      if (candidates.length === 0) {
        return yield* Effect.fail(new NoResolversError(intent.id));
      }

      const effect = candidates[0].resolve(intent.data, intent.undo ?? false);
      const result = Effect.isEffect(effect) ? yield* effect : yield* Effect.promise(async () => effect);
      return { _intent: intent, ...result } as AnyIntentResult;
    });

  const dispatch: IntentDispatcher = (intent, depth = 0) => {
    log('dispatch', { intent: intent.id, depth });
    return Effect.gen(function* () {
      if (depth > executionLimit) {
        return yield* Effect.fail(new CycleDetectedError());
      }

      log('processing', { intent });
      const result = yield* handleIntent(intent);
      log('ok', { intent: intent.id, result });

      // Dispatch follow-up intents.
      if (result.intents) {
        for (const followUp of result.intents) {
          // Returned intents are dispatched but not added to history, as such they cannot be undone.
          yield* dispatch(followUp, depth + 1);
        }
      }

      if (result.error) {
        log.error('failed', { intent: intent.id, error: result.error });
        return yield* Effect.fail(result.error);
      }

      // Add to history.
      yield* Ref.update(historyRef, (history) => {
        const next = [...history, result];
        if (next.length > historyLimit) {
          next.splice(0, next.length - historyLimit);
        }
        return next;
      });

      if (result.undoable) {
        yield* Function.pipe(
          dispatch(createIntent(IntentAction.ShowUndo, { message: result.undoable.message })),
          Effect.catchSome((err) =>
            err instanceof NoResolversError ? Option.some(Effect.succeed(undefined)) : Option.none(),
          ),
        );
      }

      log('done', { intent: intent.id, result: result.data });
      return result.data;
    });
  };

  const dispatchPromise: PromiseIntentDispatcher = (intent) => {
    return runAndForwardErrors(dispatch(intent))
      .then((data: any) => ({ data }))
      .catch((error: any) => {
        log.catch(error);
        return { error };
      });
  };

  const undo: IntentUndo = () => {
    return Effect.gen(function* () {
      const history = yield* historyRef.get;
      const lastIndex = history.findLastIndex(isUndoable);
      const result = lastIndex !== -1 ? history[lastIndex] : undefined;
      if (result) {
        const { _intent, undoable } = result;
        const data = _intent.data;
        const undoData = undoable?.data ?? {};
        const undoIntent = { ..._intent, data: { ...data, ...undoData }, undo: true } satisfies AnyIntent;
        yield* Ref.update(historyRef, (h) => h.filter((_, index) => index !== lastIndex));
        return yield* dispatch(undoIntent);
      }
    });
  };

  const undoPromise: PromiseIntentUndo = () => {
    return runAndForwardErrors(undo())
      .then((data: any) => ({ data }))
      .catch((error: any) => ({ error }));
  };

  return { dispatch, dispatchPromise, undo, undoPromise };
};

const defaultEffect = () => Effect.fail(new Error('Intent runtime not ready'));
const defaultPromise = () => runAndForwardErrors(defaultEffect());

export default Capability.makeModule((context) => {
  const state = live<IntentContext>({
    dispatch: defaultEffect,
    dispatchPromise: defaultPromise,
    undo: defaultEffect,
    undoPromise: defaultPromise,
  });

  const { dispatch, undo } = createDispatcher(() => context.getCapabilities(Common.Capability.IntentResolver).flat());

  const manager = context.getCapability(Common.Capability.PluginManager);
  state.dispatch = (intent, depth) => {
    return Effect.gen(function* () {
      yield* manager.activate(Common.ActivationEvent.SetupIntentResolver);
      return yield* dispatch(intent, depth);
    });
  };
  state.dispatchPromise = (intent) => {
    return runAndForwardErrors(state.dispatch(intent))
      .then((data: any) => ({ data }))
      .catch((error: any) => {
        log.catch(error);
        return { error };
      });
  };
  state.undo = undo;
  state.undoPromise = () => {
    return runAndForwardErrors(state.undo())
      .then((data: any) => ({ data }))
      .catch((error: any) => ({ error }));
  };

  return Effect.succeed(Capability.contributes(Common.Capability.IntentDispatcher, state));
});
