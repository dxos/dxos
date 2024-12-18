//
// Copyright 2024 DXOS.org
//

import { Effect, Ref } from 'effect';

import { type MaybePromise, pick } from '@dxos/util';

import {
  createIntent,
  IntentAction,
  type AnyIntent,
  type AnyIntentChain,
  type Intent,
  type IntentChain,
  type IntentData,
  type IntentParams,
  type IntentResultData,
  type IntentSchema,
  type Label,
} from './intent';

const EXECUTION_LIMIT = 100;
const HISTORY_LIMIT = 100;

/**
 * The return value of an intent effect.
 */
export type IntentEffectResult<Fields extends IntentParams> = {
  /**
   * The output of the action that was performed.
   *
   * If the intent is apart of a chain of intents, the data will be passed to the next intent.
   */
  data?: IntentResultData<Fields>;

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
    data?: Partial<IntentData<Fields>>;
  };

  /**
   * An error that occurred while performing the action.
   *
   * If the intent is apart of a chain of intents and an error occurs, the chain will be aborted.
   */
  error?: Error;

  /**
   * Other intent chains to be triggered.
   */
  intents?: AnyIntentChain[];
};

export type AnyIntentEffectResult = IntentEffectResult<any>;

/**
 * The result of an intent dispatcher.
 */
export type IntentDispatcherResult<Fields extends IntentParams> = Pick<IntentEffectResult<Fields>, 'data' | 'error'>;

/**
 * Determines the priority of the effect when multiple intent resolvers are matched.
 *
 * - `static` - The effect is selected in the order it was resolved.
 * - `hoist` - The effect is selected before `static` effects.
 * - `fallback` - The effect is selected after `static` effects.
 */
export type IntentDisposition = 'static' | 'hoist' | 'fallback';

/**
 * The implementation of an intent effect.
 */
export type IntentEffectDefinition<Fields extends IntentParams> = (
  data: IntentData<Fields>,
  undo: boolean,
) => MaybePromise<IntentEffectResult<Fields> | void> | Effect.Effect<IntentEffectResult<Fields> | void>;

/**
 * Intent resolver to match intents to their effects.
 */
export type IntentResolver<Tag extends string, Fields extends IntentParams> = {
  action: Tag;
  disposition?: IntentDisposition;
  // TODO(wittjosiah): Would be nice to make this a guard for intents with optional data.
  filter?: (data: IntentData<Fields>) => boolean;
  effect: IntentEffectDefinition<Fields>;
};

export type AnyIntentResolver = IntentResolver<any, any>;

/**
 * Creates an intent resolver to match intents to their effects.
 * @param schema Schema of the intent. Must be a tagged class with input and output schemas.
 * @param effect Effect to be performed when the intent is resolved.
 * @param params.disposition Determines the priority of the resolver when multiple are resolved.
 * @param params.filter Optional filter to determine if the resolver should be used.
 */
export const createResolver = <Tag extends string, Fields extends IntentParams>(
  schema: IntentSchema<Tag, Fields>,
  effect: IntentEffectDefinition<Fields>,
  params: Pick<IntentResolver<Tag, Fields>, 'disposition' | 'filter'> = {},
): IntentResolver<Tag, Fields> => ({
  action: schema._tag,
  effect,
  ...params,
});

/**
 * Invokes intents and returns the result.
 */
export type PromiseIntentDispatcher = <Fields extends IntentParams>(
  intent: IntentChain<any, any, any, Fields>,
) => Promise<IntentDispatcherResult<Fields>>;

/**
 * Creates an effect for intents.
 */
export type IntentDispatcher = <Fields extends IntentParams>(
  intent: IntentChain<any, any, any, Fields>,
  depth?: number,
) => Effect.Effect<IntentDispatcherResult<Fields>, Error>;

type IntentResult<Tag extends string, Fields extends IntentParams> = IntentEffectResult<Fields> & {
  _intent: Intent<Tag, Fields>;
};

type AnyIntentResult = IntentResult<any, any>;

/**
 * Invokes the most recent undoable intent with undo flags.
 */
export type PromiseIntentUndo = () => Promise<IntentDispatcherResult<any> | undefined>;

/**
 * Creates an effect which undoes the last intent.
 */
export type IntentUndo = () => Effect.Effect<IntentDispatcherResult<any> | undefined, Error>;

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
  registerResolver: (id: string, resolver: AnyIntentResolver) => () => void;
};

/**
 * Sets of an intent dispatcher.
 *
 * @param resolvers An array of available intent resolvers.
 * @param params.historyLimit The maximum number of intent results to keep in history.
 * @param params.executionLimit The maximum recursion depth of intent chains.
 */
export const createDispatcher = (
  resolvers: Record<string, AnyIntentResolver[]>,
  { executionLimit = EXECUTION_LIMIT, historyLimit = HISTORY_LIMIT } = {},
): IntentContext => {
  const historyRef = Effect.runSync(Ref.make<AnyIntentResult[][]>([]));

  const handleIntent = (intent: AnyIntent) => {
    return Effect.gen(function* () {
      const candidates = Object.entries(resolvers)
        .filter(([id, _]) => (intent.plugin ? id === intent.plugin : true))
        .flatMap(([_, resolvers]) => resolvers)
        .filter((r) => r.action === intent.action)
        .filter((r) => !r.filter || r.filter(intent.data))
        .toSorted(({ disposition: a = 'static' }, { disposition: b = 'static' }) => {
          return a === b ? 0 : a === 'hoist' || b === 'fallback' ? -1 : b === 'hoist' || a === 'fallback' ? 1 : 0;
        });
      if (candidates.length === 0) {
        return {
          _intent: intent,
          error: new Error(`No resolver found for action: ${intent.action}`),
        } satisfies AnyIntentResult;
      }

      const effect = candidates[0].effect(intent.data, intent.undo ?? false);
      const result = Effect.isEffect(effect) ? yield* effect : yield* Effect.promise(async () => effect);
      return { _intent: intent, ...result } satisfies AnyIntentResult;
    });
  };

  const dispatch: IntentDispatcher = (intentChain, depth = 0) => {
    return Effect.gen(function* () {
      if (depth > executionLimit) {
        yield* Effect.fail(
          new Error('Intent execution limit exceeded. This is likely due to an infinite loop within intent resolvers.'),
        );
      }

      const resultsRef = yield* Ref.make<AnyIntentResult[]>([]);
      for (const intent of intentChain.all) {
        const { data: prev } = (yield* resultsRef.get)[0] ?? {};
        const result = yield* handleIntent({ ...intent, data: { ...intent.data, ...prev } });
        yield* Ref.update(resultsRef, (results) => [result, ...results]);
        if (result.error) {
          break;
        }
        if (result.intents) {
          for (const intent of result.intents) {
            // Returned intents are dispatched but not yielded into results,
            // as such they cannot be undone.
            // TODO(wittjosiah): Use higher execution concurrency?
            yield* dispatch(intent, depth + 1);
          }
        }
      }

      const results = yield* resultsRef.get;
      const result = results[0];
      if (result) {
        yield* Ref.update(historyRef, (history) => {
          const next = [...history, results];
          if (next.length > historyLimit) {
            next.splice(0, next.length - historyLimit);
          }
          return next;
        });

        if (result.undoable && isUndoable(results)) {
          // TODO(wittjosiah): Is there a better way to handle showing undo for chains?
          yield* dispatch(createIntent(IntentAction.ShowUndo, { message: result.undoable.message }));
        }

        return pick(result, ['data', 'error']);
      } else {
        return { data: {}, error: new Error('No results') };
      }
    });
  };

  const dispatchPromise: PromiseIntentDispatcher = (intentChain) => {
    const program = dispatch(intentChain);
    return Effect.runPromise(program);
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
    const program = undo();
    return Effect.runPromise(program);
  };

  const registerResolver = (id: string, resolver: AnyIntentResolver) => {
    resolvers[id] = [...(resolvers[id] ?? []), resolver];
    return () => {
      resolvers[id] = resolvers[id].filter((r) => r !== resolver);
    };
  };

  return { dispatch, dispatchPromise, undo, undoPromise, registerResolver };
};
