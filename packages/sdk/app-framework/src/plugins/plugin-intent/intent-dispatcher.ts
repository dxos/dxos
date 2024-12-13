//
// Copyright 2024 DXOS.org
//

import { Effect, Ref } from 'effect';

import {
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
  schema: IntentSchema<any, Tag, Fields>,
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

type IntentResult<Tag extends string, Fields extends IntentParams> = IntentEffectResult<Fields> & {
  _intent: Intent<Tag, Fields>;
};

type AnyIntentResult = IntentResult<any, any>;

/**
 * Invokes the most recent undoable intent with undo flags.
 */
export type PromiseIntentUndo = () => Promise<IntentDispatcherResult<any>>;

/**
 * Creates an effect which undoes the last intent.
 */
export type IntentUndo = () => Effect.Effect<IntentDispatcherResult<any>>;

/**
 * Sets of an intent dispatcher.
 *
 * @param resolvers An array of available intent resolvers.
 * @param params.historyLimit The maximum number of intent results to keep in history.
 */
export const createDispatcher = (resolvers: AnyIntentResolver[], { historyLimit = HISTORY_LIMIT } = {}) => {
  const history = Ref.make<AnyIntentResult[]>([]);
  const undoPromise = async () => {};
  const undo = () => {};

  const dispatch: IntentDispatcher = (intent) => {
    return Effect.gen(function* () {
      const historyRef = yield* history;

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

      const effect: Promise<AnyIntentResult> | Effect.Effect<AnyIntentResult> = (candidates[0].effect as any)(
        intent.data,
      );
      const result = Effect.isEffect(effect) ? yield* effect : yield* Effect.promise(() => effect);
      Ref.update(historyRef, (h) => {
        const next = [...h, result];
        if (next.length > historyLimit) {
          next.splice(0, next.length - historyLimit);
        }
        return next;
      });

      return result;
    });
  };

  const dispatchPromise: PromiseIntentDispatcher = async (intent) => {
    const program = dispatch(intent);
    return Effect.runPromise(program);
  };

  return { dispatch, dispatchPromise, undo, undoPromise, history };
};
