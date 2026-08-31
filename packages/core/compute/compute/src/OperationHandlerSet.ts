//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { EffectEx } from '@dxos/effect';
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

  /** The operation definitions this set resolves, enumerable WITHOUT loading any handler body. */
  definitions(): readonly Operation.Definition.Any[];

  /**
   * Resolves a single operation's handler, loading only that operation's module — the
   * per-operation counterpart to the load-everything {@link handlers}. Resolves `undefined` when
   * the key is not in this set.
   */
  getHandlerFor(key: string): Promise<Operation.WithHandler<Operation.Definition.Any> | undefined>;
}

/**
 * Normalizes an operation key to a plain NSID so callers can pass either a ToolId (plain NSID)
 * or a full DXN string.
 */
const normalizeKey = (key: string): string => (DXN.isDXN(key) ? DXN.getName(key) : key);

export const isOperationHandlerSet = (value: unknown): value is OperationHandlerSet => {
  return typeof value === 'object' && value !== null && TypeId in value;
};

export const empty: OperationHandlerSet = {
  [TypeId]: TypeId,
  handlers: Effect.succeed([]),
  getHandlers: () => Promise.resolve([]),
  definitions: () => [],
  getHandlerFor: () => Promise.resolve(undefined),
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
export const make = (...handlers: Operation.WithHandler<Operation.Definition.Any>[]): OperationHandlerSet => ({
  [TypeId]: TypeId,
  definitions: () => handlers,
  getHandlerFor: (key) => {
    const normalized = normalizeKey(key);
    return Promise.resolve(handlers.find((handler) => normalizeKey(handler.meta.key) === normalized));
  },
  getHandlers: () => Promise.resolve(handlers),
  handlers: Effect.succeed(handlers),
});

/**
 * Builds a set backed by an atom of contributed sets. The merged result is
 * cached and invalidated whenever the atom changes, so most accesses are
 * cheap but newly registered handlers are picked up.
 */
export const reactive = (
  registry: Registry.AtomRegistry,
  atom: Atom.Atom<readonly OperationHandlerSet[]>,
): OperationHandlerSet => {
  let cached: Promise<Operation.WithHandler<Operation.Definition.Any>[]> | null = null;
  // Per-key promises are memoized so repeated `getHandlerFor` calls return the SAME promise until
  // the contributions change — React `use` (useOperationHandler) relies on this thenable identity
  // to resume a suspended render instead of re-suspending on a fresh promise every retry.
  const perKey = new Map<string, Promise<Operation.WithHandler<Operation.Definition.Any> | undefined>>();
  registry.subscribe(atom, () => {
    cached = null;
    perKey.clear();
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
      Effect.tapCause(() =>
        Effect.sync(() => {
          cached = null;
        }),
      ),
    ),
  );
  const getHandlers = () => (cached ??= EffectEx.runAndForwardErrors(compute));
  return {
    [TypeId]: TypeId,
    getHandlers,
    handlers: Effect.promise(getHandlers),
    definitions: () => registry.get(atom).flatMap((set) => set.definitions()),
    // Per-operation resolution over the CURRENT contributed sets: only the matched operation's
    // module loads; the load-everything paths above stay for enumerators.
    getHandlerFor: (key) => {
      const normalized = normalizeKey(key);
      let promise = perKey.get(normalized);
      if (!promise) {
        promise = resolveFromSets(registry.get(atom), normalized).then(
          (handler) => handler,
          (err) => {
            // Evict so a transient failure is not memoized — but only this entry: an atom change
            // mid-flight clears the map, and a replacement promise must not be evicted with it.
            if (perKey.get(normalized) === promise) {
              perKey.delete(normalized);
            }
            throw err;
          },
        );
        perKey.set(normalized, promise);
      }
      return promise;
    },
  };
};

/**
 * Merges multiple operation handler sets into a single set. Per-operation resolution
 * ({@link OperationHandlerSet.getHandlerFor}) composes across the children; enumerating
 * {@link OperationHandlerSet.handlers} still forces every child.
 */
export const merge = (...sets: OperationHandlerSet[]): OperationHandlerSet => {
  assertArgument(sets.every(isOperationHandlerSet), 'sets', 'sets must be an array of OperationHandlerSet');
  const getHandlers = () => Promise.all(sets.map((set) => set.getHandlers())).then((handlers) => handlers.flat());
  return {
    [TypeId]: TypeId,
    definitions: () => sets.flatMap((set) => set.definitions()),
    getHandlerFor: (key) => resolveFromSets(sets, key),
    getHandlers,
    handlers: Effect.promise(getHandlers),
  };
};

/**
 * Creates a handler set from typed {@link Operation.LazyHandler} pairings: definitions are
 * enumerable without loading any handler body, resolving an operation imports only that
 * operation's module, and each pairing is checked so a definition cannot be wired to another
 * operation's handler.
 *
 * @example
 * ```ts
 * const set = OperationHandlerSet.lazy([
 *   MarkdownOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
 *   MarkdownOperation.Open.pipe(Operation.lazyHandler(() => import('./open'))),
 * ]);
 * ```
 */

/**
 * Creates a handler set from typed {@link Operation.LazyHandler} pairings: definitions are
 * enumerable without loading any handler body, resolving an operation imports only that
 * operation's module — per-operation loading instead of per-plugin — and each pairing is checked,
 * so a definition cannot be wired to another operation's handler. Loaded handlers are cached per
 * key.
 *
 * @example
 * ```ts
 * const set = OperationHandlerSet.lazy([
 *   MarkdownOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
 *   MarkdownOperation.Open.pipe(Operation.lazyHandler(() => import('./open'))),
 * ]);
 * ```
 */
export const lazy = (entries: readonly Operation.LazyHandler[]): OperationHandlerSet => {
  const loaded = new Map<string, Promise<Operation.WithHandler<Operation.Definition.Any>>>();
  const loadEntry = ({
    definition,
    load,
  }: Operation.LazyHandler): Promise<Operation.WithHandler<Operation.Definition.Any>> => {
    const key = normalizeKey(definition.meta.key);
    let promise = loaded.get(key);
    if (!promise) {
      // Evict on failure: a transient import failure (a stale chunk hash after a redeploy) would
      // otherwise be memoized, so every later invocation rejects instantly without re-fetching.
      promise = load().then(
        ({ default: handler }) => handler,
        (err) => {
          loaded.delete(key);
          throw err;
        },
      );
      loaded.set(key, promise);
    }
    return promise;
  };
  const getHandlers = () => Promise.all(entries.map(loadEntry));
  return {
    [TypeId]: TypeId,
    definitions: () => entries.map(({ definition }) => definition),
    getHandlerFor: (key) => {
      const normalized = normalizeKey(key);
      const entry = entries.find(({ definition }) => normalizeKey(definition.meta.key) === normalized);
      return entry ? loadEntry(entry) : Promise.resolve(undefined);
    },
    getHandlers,
    handlers: Effect.promise(getHandlers),
  };
};

/**
 * Per-operation resolution across a list of sets, in contribution order so an earlier
 * contribution overrides a later one.
 */
const resolveFromSets = async (
  sets: readonly OperationHandlerSet[],
  key: string,
): Promise<Operation.WithHandler<Operation.Definition.Any> | undefined> => {
  for (const set of sets) {
    const handler = await set.getHandlerFor(key);
    if (handler) {
      return handler;
    }
  }
  return undefined;
};

/** Finds a handler in the set, loading only the matched operation's module. */
const lookup = (
  set: OperationHandlerSet,
  key: string,
): Effect.Effect<Operation.WithHandler<Operation.Definition.Any>, NoHandlerError> =>
  Effect.gen(function* () {
    const handler = yield* Effect.promise(() => set.getHandlerFor(key));
    if (handler) {
      return handler;
    }
    return yield* Effect.fail(new NoHandlerError(key));
  });

/**
 * Gets a handler for an operation by definition.
 */
export const getHandler = <const Op extends Operation.Definition.Any>(
  set: OperationHandlerSet,
  definition: Op,
): Effect.Effect<Operation.WithHandler<Op>, NoHandlerError> =>
  lookup(set, definition.meta.key) as Effect.Effect<Operation.WithHandler<Op>, NoHandlerError>;

/**
 * Promise counterpart of {@link getHandler}: definition-typed {@link OperationHandlerSet.getHandlerFor},
 * resolving `undefined` on a miss instead of failing.
 */
export const findHandler = <const Op extends Operation.Definition.Any>(
  set: OperationHandlerSet,
  definition: Op,
): Promise<Operation.WithHandler<Op> | undefined> =>
  set.getHandlerFor(definition.meta.key) as Promise<Operation.WithHandler<Op> | undefined>;

/**
 * Gets a handler for an operation by key.
 * Accepts either a plain NSID (`org.dxos.operation.assistantToolkit.addContext`) or a
 * full DXN string (`dxn:org.dxos.operation.assistantToolkit.addContext`).
 */
export const getHandlerByKey = (
  set: OperationHandlerSet,
  key: string,
): Effect.Effect<Operation.WithHandler<Operation.Definition.Any>, NoHandlerError> => lookup(set, key);

export class OperationHandlerProvider extends Context.Service<OperationHandlerProvider, OperationHandlerSet>()(
  '@dxos/operation/OperationHandlerProvider',
) {}

export const provide = (handlers: OperationHandlerSet): Layer.Layer<OperationHandlerProvider, never, never> =>
  Layer.succeed(OperationHandlerProvider, handlers);
