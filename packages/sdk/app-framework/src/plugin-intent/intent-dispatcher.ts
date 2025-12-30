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
  type AnyIntentChain,
  type Intent,
  type IntentChain,
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
   *
   * If the intent is apart of a chain of intents, the data will be passed to the next intent.
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
   * If the intent is apart of a chain of intents and an error occurs, the chain will be aborted.
   *
   * Return caught error instead of throwing to trigger other intent to be triggered prior to returning the error.
   */
  error?: Error;

  /**
   * Other intent chains to be triggered.
   */
  intents?: AnyIntentChain[];
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
  intent: IntentChain<any, any, any, Fields>,
) => Promise<Types.Simplify<IntentDispatcherResult<IntentData<Fields>, IntentResultData<Fields>>>>;

/**
 * Creates an effect for intents.
 */
export type IntentDispatcher = <Fields extends IntentProps>(
  intent: IntentChain<any, any, any, Fields>,
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
 * Check if a chain of results is undoable.
 */
const isUndoable = (historyEntry: AnyIntentResult[]): boolean =>
  historyEntry.length > 0 && historyEntry.every(({ undoable }) => !!undoable);

export type IntentContext = {
  dispatch: IntentDispatcher;
  dispatchPromise: PromiseIntentDispatcher;
  undo: IntentUndo;
  undoPromise: PromiseIntentUndo;
};

/**
 * Sets of an intent dispatcher.
 *
 * @param getResolvers A function that returns an array of available intent resolvers.
 * @param params.historyLimit The maximum number of intent results to keep in history.
 * @param params.executionLimit The maximum recursion depth of intent chains.
 */
export const createDispatcher = (
  getResolvers: () => AnyIntentResolver[],
  { executionLimit = EXECUTION_LIMIT, historyLimit = HISTORY_LIMIT } = {},
): IntentContext => {
  const historyRef = Effect.runSync(Ref.make<AnyIntentResult[][]>([]));

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

  const dispatch: IntentDispatcher = (intentChain, depth = 0) => {
    log('dispatch', { intentChain: intentChain.all.map((i) => i.id), depth });
    return Effect.gen(function* () {
      if (depth > executionLimit) {
        return yield* Effect.fail(new CycleDetectedError());
      }

      const resultsRef = yield* Ref.make<AnyIntentResult[]>([]);
      for (const intent of intentChain.all) {
        log('processing', { intent });
        const { data: prev } = (yield* resultsRef.get)[0] ?? {};
        const result = yield* handleIntent({ ...intent, data: { ...intent.data, ...prev } });
        log('ok', { intent: intent.id, result });
        yield* Ref.update(resultsRef, (results) => [result, ...results]);
        if (result.intents) {
          for (const intent of result.intents) {
            // Returned intents are dispatched but not yielded into results, as such they cannot be undone.
            // TODO(wittjosiah): Use higher execution concurrency?
            yield* dispatch(intent, depth + 1);
          }
        }

        if (result.error) {
          // yield* dispatch(
          //   createIntent(IntentAction.Track, {
          //     intents: intentChain.all.map((i) => i.id),
          //     error: result.error.message,
          //   }),
          // );
          log.error('failed', { intent: intent.id, error: result.error });
          return yield* Effect.fail(result.error);
        }
      }

      // Track the intent chain.
      // if (intentChain.all.some((intent) => intent.id !== IntentAction.Track._tag)) {
      //   yield* dispatch(createIntent(IntentAction.Track, { intents: intentChain.all.map((i) => i.id) }));
      // }

      const results = yield* resultsRef.get;
      const result = results[0];
      yield* Ref.update(historyRef, (history) => {
        const next = [...history, results];
        if (next.length > historyLimit) {
          next.splice(0, next.length - historyLimit);
        }
        return next;
      });

      if (result.undoable && isUndoable(results)) {
        // TODO(wittjosiah): Is there a better way to handle showing undo for chains?
        yield* Function.pipe(
          dispatch(createIntent(IntentAction.ShowUndo, { message: result.undoable.message })),
          Effect.catchSome((err) =>
            err instanceof NoResolversError ? Option.some(Effect.succeed(undefined)) : Option.none(),
          ),
        );
      }

      log('done', { intent: intentChain.all.map((i) => i.id), result: result.data });
      return result.data;
    });
  };

  const dispatchPromise: PromiseIntentDispatcher = (intentChain) => {
    return runAndForwardErrors(dispatch(intentChain))
      .then((data: any) => ({ data }))
      .catch((error: any) => {
        log.catch(error);
        return { error };
      });
  };

  const undo: IntentUndo = () => {
    return Effect.gen(function* () {
      const history = yield* historyRef.get;
      const last = history.findLastIndex(isUndoable);
      const result = last !== -1 ? history[last] : undefined;
      if (result) {
        const all = result.map(({ _intent, undoable }): AnyIntent => {
          const data = _intent.data;
          const undoData = undoable?.data ?? {};
          return { ..._intent, data: { ...data, ...undoData }, undo: true } satisfies AnyIntent;
        });
        const intent = { first: all[0], last: all.at(-1)!, all } satisfies AnyIntentChain;
        yield* Ref.update(historyRef, (h) => h.filter((_, index) => index !== last));
        return yield* dispatch(intent);
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

  // TODO(wittjosiah): Make getResolver callback async and allow resolvers to be requested on demand.
  const { dispatch, undo } = createDispatcher(() => context.getCapabilities(Common.Capability.IntentResolver).flat());

  const manager = context.getCapability(Common.Capability.PluginManager);
  state.dispatch = (intentChain, depth) => {
    return Effect.gen(function* () {
      yield* manager.activate(Common.ActivationEvent.SetupIntentResolver);
      return yield* dispatch(intentChain, depth);
    });
  };
  state.dispatchPromise = (intentChain) => {
    return runAndForwardErrors(state.dispatch(intentChain))
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
