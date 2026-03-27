//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type * as Operation from './Operation';
import { NoHandlerError } from './errors';

export const TypeId = '~@dxos/operation/OperationHandlerSet' as const;
export type TypeId = typeof TypeId;

export interface OperationHandlerSet {
  [TypeId]: TypeId;

  readonly handlers: Effect.Effect<Operation.WithHandler<Operation.Definition.Any>[]>;

  getHandlers(): Promise<Operation.WithHandler<Operation.Definition.Any>[]>;
}

export const empty: OperationHandlerSet = {
  [TypeId]: TypeId,
  handlers: Effect.succeed([]),
  getHandlers: () => Promise.resolve([]),
};

/**
 * Creates a new operation handler set from a list of handlers.
 *
 * @example
 * ```ts
 * const set = OperationHandlerSet.make(
 *   Operation.withHandler(Operation.make({ input: Schema.Void, output: Schema.Void }), (input) => Effect.succeed({})),
 *   Operation.withHandler(Operation.make({ input: Schema.Void, output: Schema.Void }), (input) => Effect.succeed({})),
 * );
 * ```
 */
export const make = (...handlers: Operation.WithHandler<Operation.Definition.Any>[]): OperationHandlerSet => {
  return async(() => Promise.resolve(handlers));
};

export const async = (
  getHandlers: () => Promise<Operation.WithHandler<Operation.Definition.Any>[]>,
): OperationHandlerSet => {
  return {
    [TypeId]: TypeId,
    getHandlers,
    handlers: Effect.promise(getHandlers),
  };
};

/**
 * Merges multiple operation handler sets into a single set.
 *
 */
export const merge = (...sets: OperationHandlerSet[]): OperationHandlerSet => {
  return async(() => Promise.all(sets.map((set) => set.getHandlers())).then((handlers) => handlers.flat()));
};

/**
 * Creates a new operation handler set from a list of lazy-loaded modules.
 *
 * @example
 * ```ts
 * const set = OperationHandlerSet.lazy(
 *   () => import('./my-handler'),
 *   () => import('./my-other-handler'),
 * );
 * ```
 */
export const lazy = (
  ...modules: (() => Promise<{ default: Operation.WithHandler<Operation.Definition.Any> }>)[]
): OperationHandlerSet => {
  return async(() => Promise.all(modules.map((module) => module().then(({ default: handler }) => handler))));
};

/**
 * Gets a handler for an operation by definition.
 */
export const getHandler = <const Op extends Operation.Definition.Any>(
  set: OperationHandlerSet,
  definition: Op,
): Effect.Effect<Operation.WithHandler<Op>, NoHandlerError> =>
  Effect.gen(function* () {
    const handlers = yield* set.handlers;
    const handler = handlers.find((handler) => handler.meta.key === definition.meta.key);
    if (!handler) {
      return yield* Effect.fail(new NoHandlerError(definition.meta.key));
    }
    return handler as any;
  });

/**
 * Gets a handler for an operation by key.
 */
export const getHandlerByKey = (
  set: OperationHandlerSet,
  key: string,
): Effect.Effect<Operation.WithHandler<Operation.Definition.Any>, NoHandlerError> =>
  Effect.gen(function* () {
    const handlers = yield* set.handlers;
    const handler = handlers.find((handler) => handler.meta.key === key);
    if (!handler) {
      return yield* Effect.fail(new NoHandlerError(key));
    }
    return handler as any;
  });

export class OperationHandlerProvider extends Context.Tag('@dxos/operation/OperationHandlerProvider')<
  OperationHandlerProvider,
  OperationHandlerSet
>() {}

export const provide = (handlers: OperationHandlerSet): Layer.Layer<OperationHandlerProvider, never, never> =>
  Layer.succeed(OperationHandlerProvider, handlers);
