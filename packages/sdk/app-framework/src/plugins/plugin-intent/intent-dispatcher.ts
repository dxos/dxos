//
// Copyright 2024 DXOS.org
//

import { Effect, Ref } from 'effect';

import { pick } from '@dxos/util';

import {
  type IntentChain,
  type AnyIntent,
  type Intent,
  type IntentData,
  type IntentParams,
  type IntentResultData,
  type IntentSchema,
} from './intent';

const HISTORY_LIMIT = 100;

// NOTE: Should maintain compatibility with `i18next` (and @dxos/react-ui).
export type Label = string | [string, { ns: string; count?: number }];

/**
 * The return value of an intent effect.
 */
export type IntentEffectResult<Fields extends IntentParams> = {
  /**
   * The output of the action that was performed.
   *
   * If the intent is apart of a chain of intents, the data will be passed to the next intent.
   */
  data: IntentResultData<Fields>;

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
  intents?: AnyIntent[];
};

export type AnyIntentEffectResult = IntentEffectResult<any>;

/**
 * The result of an intent dispatcher.
 */
export type IntentDispatcherResult<Fields extends IntentParams> = Pick<IntentEffectResult<Fields>, 'data' | 'error'>;

/**
 * Determines the priority of the surface when multiple components are resolved.
 */
export type IntentDisposition = 'default' | 'hoist' | 'fallback';

/**
 * The implementation of an intent effect.
 */
export type IntentEffectDefinition<Fields extends IntentParams> = (
  data: IntentData<Fields>,
  undo: boolean,
) => Promise<IntentEffectResult<Fields>> | Effect.Effect<IntentEffectResult<Fields>>;

/**
 * Intent resolver to match intents to their effects.
 */
export type IntentResolver<Tag extends string, Fields extends IntentParams> = {
  action: Tag;
  disposition?: IntentDisposition;
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
 * Invokes an intent and returns the result.
 */
export type PromiseIntentDispatcher = <Tag extends string, Fields extends IntentParams>(
  intent: Intent<Tag, Fields>,
) => Promise<IntentDispatcherResult<Fields>>;

/**
 * Creates an effect for an intent.
 */
export type IntentDispatcher = <Tag extends string, Fields extends IntentParams>(
  intent: Intent<Tag, Fields>,
) => Effect.Effect<IntentDispatcherResult<Fields>>;

/**
 * Invokes an intent chain and returns the result.
 */
export type PromiseIntentChainDispatcher = <Fields extends IntentParams>(
  intent: IntentChain<any, any, any, Fields>,
) => Promise<IntentDispatcherResult<Fields>>;

/**
 * Creates an effect for an intent.
 */
export type IntentChainDispatcher = <Fields extends IntentParams>(
  intent: IntentChain<any, any, any, Fields>,
) => Effect.Effect<IntentDispatcherResult<Fields>>;

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
export type IntentUndo = () => Effect.Effect<IntentDispatcherResult<any> | undefined>;

/**
 * Sets of an intent dispatcher.
 *
 * @param resolvers An array of available intent resolvers.
 * @param params.historyLimit The maximum number of intent results to keep in history.
 */
export const createDispatcher = (resolvers: AnyIntentResolver[], { historyLimit = HISTORY_LIMIT } = {}) => {
  const historyRef = Effect.runSync(Ref.make<AnyIntentResult[]>([]));

  const dispatch: IntentDispatcher = (intent) => {
    return Effect.gen(function* () {
      if (intent.plugin) {
        // TODO(wittjosiah): Dispatch to a specific plugin.
      }

      const candidates = resolvers
        .filter((r) => r.action === intent.action)
        .toSorted(({ disposition: a = 'default' }, { disposition: b = 'default' }) => {
          return a === b ? 0 : a === 'hoist' || b === 'fallback' ? -1 : b === 'hoist' || a === 'fallback' ? 1 : 0;
        });
      if (candidates.length === 0) {
        throw new Error(`No resolver found for action: ${intent.action}`);
      }

      const effect = candidates[0].effect(intent.data, intent.undo ?? false);
      const result = Effect.isEffect(effect) ? yield* effect : yield* Effect.promise(() => effect);
      yield* Ref.update(historyRef, (h) => {
        const next = [...h, { _intent: intent, ...result }];
        if (next.length > historyLimit) {
          next.splice(0, next.length - historyLimit);
        }
        return next;
      });
      if (result.intents) {
        for (const intent of result.intents) {
          yield* dispatch(intent);
        }
      }

      return pick(result, ['data', 'error']);
    });
  };

  const dispatchPromise: PromiseIntentDispatcher = async (intent) => {
    const program = dispatch(intent);
    return Effect.runPromise(program);
  };

  const dispatchChain: IntentChainDispatcher = (intentChain) => {
    return Effect.gen(function* () {
      const prevRef = yield* Ref.make<IntentDispatcherResult<any> | undefined>(undefined);
      for (const intent of intentChain.all) {
        const prev = (yield* prevRef.get)?.data ?? {};
        const result = yield* dispatch({ ...intent, data: { ...intent.data, ...prev } });
        if (result.error) {
          return result;
        }
        yield* Ref.update(prevRef, () => result);
      }

      const result = yield* prevRef.get;
      if (result) {
        return result;
      } else {
        return { data: {}, error: new Error('No results') };
      }
    });
  };

  const dispatchChainPromise: PromiseIntentChainDispatcher = async (intentChain) => {
    const program = dispatchChain(intentChain);
    return Effect.runPromise(program);
  };

  // TODO(wittjosiah): History needs to track chains so that they can be undone as a unit.
  const undo: IntentUndo = () => {
    return Effect.gen(function* () {
      const history = yield* historyRef.get;
      const last = history.findLastIndex((r) => !!r.undoable);
      const result = last !== -1 ? history[last] : undefined;
      if (result) {
        const data = result._intent.data;
        const undoData = result.undoable?.data ?? {};
        const intent = { ...result._intent, data: { ...data, ...undoData }, undo: true } satisfies AnyIntent;
        yield* Ref.update(historyRef, (h) => h.filter((_, index) => index !== last));
        return yield* dispatch(intent);
      }
    });
  };

  const undoPromise = async () => {
    const program = undo();
    return Effect.runPromise(program);
  };

  return { dispatch, dispatchPromise, dispatchChain, dispatchChainPromise, undo, undoPromise, history: historyRef };
};
