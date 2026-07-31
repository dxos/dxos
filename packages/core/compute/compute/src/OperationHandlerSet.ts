//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom, type Registry } from '@effect-atom/atom';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';

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

  /**
   * The operation definitions this set can resolve, enumerable WITHOUT loading handler bodies.
   * Implemented by {@link keyed} sets (and compositions of them); consumers that only need
   * definitions (registry mirrors, pickers) read this instead of forcing {@link handlers}.
   */
  definitions?(): readonly Operation.Definition.Any[];

  /**
   * Resolves a single operation's handler, loading only that operation's module — the
   * per-operation counterpart to the load-everything {@link handlers}. Resolves `undefined` when
   * the key is not in this set. Implemented by {@link keyed} sets and their compositions;
   * {@link getHandler}/{@link getHandlerByKey} prefer this path when present.
   */
  getHandlerFor?(key: string): Promise<Operation.WithHandler<Operation.Definition.Any> | undefined>;

  /**
   * Optional demand hook consulted by {@link getHandler}/{@link getHandlerByKey} when a lookup
   * misses: given the operation key, attempt to make the handler available (e.g. activate the
   * plugin module that would contribute it) and resolve `true` if the set may have changed.
   * The lookup then re-reads the set once before failing. See {@link withResolver}.
   */
  resolveMissing?(key: string): Promise<boolean>;
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
  const getHandlers = () => (cached ??= EffectEx.runAndForwardErrors(compute));
  return {
    [TypeId]: TypeId,
    getHandlers,
    handlers: Effect.promise(getHandlers),
    // Per-operation resolution over the CURRENT contributed sets: keyed contributions load only
    // the matched operation's module; the load-everything paths above stay for enumerators.
    getHandlerFor: (key) => resolveFromSets(registry.get(atom), key),
  };
};

/**
 * Attaches a demand resolver to a set: on a lookup miss the resolver runs once (deduplicated per
 * key) before the lookup fails, so handlers whose modules are deferred by an activation policy
 * load exactly when their operation is first invoked.
 */
export const withResolver = (
  set: OperationHandlerSet,
  resolveMissing: (key: string) => Promise<boolean>,
): OperationHandlerSet => {
  // One in-flight resolution per key: concurrent misses await the same attempt, and a completed
  // attempt is not repeated (a key that failed to resolve once fails fast afterwards).
  const attempts = new Map<string, Promise<boolean>>();
  return {
    [TypeId]: TypeId,
    getHandlers: () => set.getHandlers(),
    handlers: set.handlers,
    ...(set.definitions ? { definitions: () => set.definitions!() } : {}),
    ...(set.getHandlerFor ? { getHandlerFor: (key: string) => set.getHandlerFor!(key) } : {}),
    resolveMissing: (key: string) => {
      let attempt = attempts.get(key);
      if (!attempt) {
        attempt = resolveMissing(key);
        attempts.set(key, attempt);
      }
      return attempt;
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
  const base = async(() => Promise.all(sets.map((set) => set.getHandlers())).then((handlers) => handlers.flat()));
  return {
    ...base,
    getHandlerFor: (key) => resolveFromSets(sets, key),
    ...(sets.every((set) => set.definitions) ? { definitions: () => sets.flatMap((set) => set.definitions!()) } : {}),
  };
};

/**
 * Creates a new operation handler set from a list of lazy-loaded modules.
 *
 * Prefer {@link keyed}: an unkeyed lazy set can only answer a lookup by importing EVERY module,
 * so one invocation loads the whole plugin's handlers.
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

/** A {@link keyed} entry: the (statically imported, lightweight) definition + its handler module. */
export type KeyedEntry = readonly [
  definition: Operation.Definition.Any,
  load: () => Promise<{ default: Operation.WithHandler<Operation.Definition.Any> }>,
];

/**
 * Creates a handler set keyed by operation definition: definitions are enumerable without
 * loading any handler body, and resolving an operation imports only that operation's module —
 * per-operation loading instead of per-plugin. Loaded handlers are cached per key.
 *
 * @example
 * ```ts
 * const set = OperationHandlerSet.keyed([
 *   [MarkdownOperation.Create, () => import('./create')],
 *   [MarkdownOperation.Open, () => import('./open')],
 * ]);
 * ```
 */
export const keyed = (entries: readonly KeyedEntry[]): OperationHandlerSet => {
  const loaded = new Map<string, Promise<Operation.WithHandler<Operation.Definition.Any>>>();
  const loadEntry = ([definition, load]: KeyedEntry): Promise<Operation.WithHandler<Operation.Definition.Any>> => {
    const key = normalizeKey(definition.meta.key);
    let promise = loaded.get(key);
    if (!promise) {
      promise = load().then(({ default: handler }) => handler);
      loaded.set(key, promise);
    }
    return promise;
  };
  const getHandlers = () => Promise.all(entries.map(loadEntry));
  return {
    [TypeId]: TypeId,
    definitions: () => entries.map(([definition]) => definition),
    getHandlerFor: (key) => {
      const normalized = normalizeKey(key);
      const entry = entries.find(([definition]) => normalizeKey(definition.meta.key) === normalized);
      return entry ? loadEntry(entry) : Promise.resolve(undefined);
    },
    getHandlers,
    handlers: Effect.promise(getHandlers),
  };
};

/**
 * Per-operation resolution across a list of sets: keyed sets answer from their index; unkeyed
 * sets are forced (their whole handler list loads) only when no keyed set matched first — so
 * per-operation granularity degrades per-set, not globally, during migration to {@link keyed}.
 */
const resolveFromSets = async (
  sets: readonly OperationHandlerSet[],
  key: string,
): Promise<Operation.WithHandler<Operation.Definition.Any> | undefined> => {
  const normalized = normalizeKey(key);
  for (const set of sets) {
    if (set.getHandlerFor) {
      const handler = await set.getHandlerFor(key);
      if (handler) {
        return handler;
      }
    }
  }
  for (const set of sets) {
    if (!set.getHandlerFor) {
      const handlers = await set.getHandlers();
      const handler = handlers.find((entry) => normalizeKey(entry.meta.key) === normalized);
      if (handler) {
        return handler;
      }
    }
  }
  return undefined;
};

/**
 * Finds a handler in the set. Sets implementing {@link OperationHandlerSet.getHandlerFor}
 * resolve per-operation (only the matched handler's module loads); others force the full list.
 * On a miss, the set's optional {@link OperationHandlerSet.resolveMissing} demand hook runs once
 * and the lookup retries before giving up.
 */
const lookup = (
  set: OperationHandlerSet,
  key: string,
  match: (handler: Operation.WithHandler<Operation.Definition.Any>) => boolean,
): Effect.Effect<Operation.WithHandler<Operation.Definition.Any>, NoHandlerError> => {
  const attempt = set.getHandlerFor
    ? Effect.promise(() => set.getHandlerFor!(key))
    : Effect.map(set.handlers, (handlers) => handlers.find(match));
  return Effect.gen(function* () {
    const handler = yield* attempt;
    if (handler) {
      return handler;
    }
    if (set.resolveMissing && (yield* Effect.promise(() => set.resolveMissing!(key)))) {
      const late = yield* attempt;
      if (late) {
        return late;
      }
    }
    return yield* Effect.fail(new NoHandlerError(key));
  });
};

/**
 * Gets a handler for an operation by definition.
 */
export const getHandler = <const Op extends Operation.Definition.Any>(
  set: OperationHandlerSet,
  definition: Op,
): Effect.Effect<Operation.WithHandler<Op>, NoHandlerError> =>
  lookup(set, definition.meta.key, (handler) => handler.meta.key === definition.meta.key) as Effect.Effect<
    Operation.WithHandler<Op>,
    NoHandlerError
  >;

/**
 * Gets a handler for an operation by key.
 * Accepts either a plain NSID (`org.dxos.function.database.contextAdd`) or a
 * full DXN string (`dxn:org.dxos.function.database.contextAdd`).
 */
export const getHandlerByKey = (
  set: OperationHandlerSet,
  key: string,
): Effect.Effect<Operation.WithHandler<Operation.Definition.Any>, NoHandlerError> => {
  // Normalize both sides to plain NSID for comparison so callers can pass
  // either a ToolId (plain NSID) or a full DXN string.
  const normalizeKey = (k: string) => (DXN.isDXN(k) ? DXN.getName(k) : k);
  const normalizedKey = normalizeKey(key);
  return lookup(set, key, (handler) => normalizeKey(handler.meta.key) === normalizedKey);
};

export class OperationHandlerProvider extends Context.Tag('@dxos/operation/OperationHandlerProvider')<
  OperationHandlerProvider,
  OperationHandlerSet
>() {}

export const provide = (handlers: OperationHandlerSet): Layer.Layer<OperationHandlerProvider, never, never> =>
  Layer.succeed(OperationHandlerProvider, handlers);
