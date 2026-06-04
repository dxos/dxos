//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom, type Registry } from '@effect-atom/atom';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';

import { runAndForwardErrors } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { NoHandlerError } from './errors';
import type * as Operation from './Operation';

export const TypeId = '~@dxos/operation/OperationHandlerSet' as const;
export type TypeId = typeof TypeId;

export interface OperationHandlerSet {
  [TypeId]: TypeId;

  readonly handlers: Effect.Effect<Operation.WithHandler<Operation.Definition.Any>[]>;

  getHandlers(): Promise<Operation.WithHandler<Operation.Definition.Any>[]>;
}

export const isOperationHandlerSet = (value: unknown): value is OperationHandlerSet => {
  return typeof value === 'object' && value !== null && TypeId in value;
};

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
  // NOTE: Re-runing async module imports has a big performance penalty in Chrome.
  let promise: Promise<Operation.WithHandler<Operation.Definition.Any>[]> | null = null;
  const getHandlersCached = () => {
    if (!promise) {
      promise = getHandlers();
    }
    return promise;
  };
  return {
    [TypeId]: TypeId,
    getHandlers,
    handlers: Effect.promise(getHandlersCached),
  };
};

/**
 * Builds a set backed by an atom of contributed sets. The merged result is
 * cached and invalidated whenever the atom changes, so most accesses are
 * cheap but newly registered handlers are picked up.
 */
export const reactive = (
  registry: Registry.Registry,
  atom: Atom.Atom<readonly OperationHandlerSet[]>,
): OperationHandlerSet => {
  let cached: Promise<Operation.WithHandler<Operation.Definition.Any>[]> | null = null;
  registry.subscribe(atom, () => {
    cached = null;
  });
  // `suspend` defers `registry.get(atom)` until each run, so re-evaluations
  // after cache invalidation see the current contributed sets.
  const compute = Effect.suspend(() =>
    pipe(
      registry.get(atom),
      Effect.forEach((set) => set.handlers, { concurrency: 'unbounded' }),
      Effect.map((groups) => groups.flat()),
      // Reset cached on failure so a transient error doesn't permanently
      // poison subsequent calls.
      Effect.tapErrorCause(() =>
        Effect.sync(() => {
          cached = null;
        }),
      ),
    ),
  );
  const getHandlers = () => (cached ??= runAndForwardErrors(compute));
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
  assertArgument(sets.every(isOperationHandlerSet), 'sets', 'sets must be an array of OperationHandlerSet');
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
 * Accepts either a plain NSID (`org.dxos.function.database.contextAdd`) or a
 * full DXN string (`dxn:org.dxos.function.database.contextAdd`).
 */
export const getHandlerByKey = (
  set: OperationHandlerSet,
  key: string,
): Effect.Effect<Operation.WithHandler<Operation.Definition.Any>, NoHandlerError> =>
  Effect.gen(function* () {
    const handlers = yield* set.handlers;
    // Normalize both sides to plain NSID for comparison so callers can pass
    // either a ToolId (plain NSID) or a full DXN string.
    const normalizeKey = (k: string) => (DXN.isDXN(k) ? DXN.getName(k) : k);
    const normalizedKey = normalizeKey(key);
    const handler = handlers.find((handler) => normalizeKey(handler.meta.key) === normalizedKey);
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
