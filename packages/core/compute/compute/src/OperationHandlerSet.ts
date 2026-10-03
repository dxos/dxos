//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import * as Semaphore from 'effect/Semaphore';

import { EffectEx, SchemaAST } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { InvalidOperationInputError, NoHandlerError } from './errors.ts';
import * as Operation from './Operation.ts';
import * as StorageService from './StorageService.ts';
import * as Trace from './Trace.ts';

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
        const evictUnlessReplaced = (err: unknown) => {
          if (perKey.get(normalized) === promise) {
            perKey.delete(normalized);
          }
          throw err;
        };
        promise = resolveFromSets(registry.get(atom), normalized).then((handler) => handler, evictUnlessReplaced);
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

//
// Durable adapter.
//

/**
 * Durable marker recording that an operation's input handler has begun executing.
 * Persisted before the handler runs so that, after an interruption (suspend/restart), a
 * re-delivered input can tell that the previous attempt was in-flight. Cleared automatically
 * when the process reaches a terminal state (the runtime clears the process's storage).
 */
const OperationStartedCell = StorageService.cell(Schema.fromJsonString(Schema.Boolean), 'operation/started').pipe(
  StorageService.withDefault(() => false),
);

/**
 * Runs a (non-durable) operation as a durable one: a single-input process that invokes the operation's handler.
 */
export const toDurable = <const Op extends Operation.Definition.Any>(
  op: Op,
  handlers: OperationHandlerSet,
): Operation.Durable<
  Operation.Definition.Input<Op>,
  Operation.Definition.Output<Op>,
  Operation.Definition.Services<Op>
> =>
  Operation.makeDurable(
    {
      key: DXN.getName(op.meta.key),
      input: op.input,
      output: op.output,
      services: op.services,
    },
    (ctx) =>
      Effect.gen(function* () {
        const semaphore = yield* Semaphore.make(1);
        // The process runtime assumes handlers are idempotent and always re-delivers an input
        // whose handler was interrupted. Non-idempotent operations opt out of that retry here:
        // a re-delivery that observes the durable "started" marker fails instead of repeating
        // side effects. Idempotent operations skip the marker and are simply re-run.
        const idempotent = Operation.isIdempotent(op);

        return {
          onInput: (input: Operation.Definition.Input<Op>) =>
            Effect.gen(function* () {
              if (!idempotent) {
                const started = yield* OperationStartedCell.get;
                if (started) {
                  return yield* Effect.die(
                    new Error(`non-idempotent operation "${op.meta.key}" was interrupted; cannot retry safely`),
                  );
                }
                yield* OperationStartedCell.set(true);
              }

              // Emit operation start event.
              log('operation process invoking', { key: op.meta.key, name: op.meta.name });
              yield* Trace.write(Trace.OperationStart, {
                key: op.meta.key,
                name: op.meta.name,
                icon: op.meta.icon,
              });
              // Emit ephemeral operation input event for live subscribers
              // (history tracker, devtools) without persisting raw input.
              yield* Trace.write(Trace.OperationInput, {
                key: op.meta.key,
                name: op.meta.name,
                input,
              });

              // A property the schema does not declare is a caller mistake, not a value to drop:
              // a misspelled field left `query-objects` with no `text` and no `typename`, which
              // its handler read as "match everything" and returned as a successful search. The
              // edge path validates the same way in `wrapFunctionHandler`; validating here too
              // keeps a local invocation and a remote one to one contract.
              yield* validateOperationInput(op, input);

              const opHandler = yield* getHandler(handlers, op).pipe(Effect.orDie);
              const output = yield* opHandler
                .handler(input)
                .pipe(Effect.orDie, Effect.withSpan(op.meta.key)) as Effect.Effect<
                Operation.Definition.Output<Op>,
                never,
                never
              >;

              ctx.submitOutput(output);
              ctx.succeed();

              // Emit ephemeral operation output event before the persisted
              // end event so subscribers see output + completion together.
              yield* Trace.write(Trace.OperationOutput, {
                key: op.meta.key,
                name: op.meta.name,
                output,
              });
              // Emit operation end event with success after side-effects complete.
              yield* Trace.write(Trace.OperationEnd, {
                key: op.meta.key,
                name: op.meta.name,
                icon: op.meta.icon,
                outcome: 'success',
              });
            }).pipe(
              Effect.catchDefect((defect) =>
                Effect.gen(function* () {
                  // Emit operation end event with failure. Carry the error's stable name as `errorCode`
                  // so consumers can match on the failure kind (e.g. a run-again yield) without parsing
                  // the message.
                  const errorMessage = defect instanceof Error ? defect.message : String(defect);
                  const errorCode = defect instanceof Error ? defect.name : undefined;
                  yield* Trace.write(Trace.OperationEnd, {
                    key: op.meta.key,
                    name: op.meta.name,
                    icon: op.meta.icon,
                    outcome: 'failure',
                    error: errorMessage,
                    ...(errorCode ? { errorCode } : {}),
                  });
                  return yield* Effect.die(defect);
                }),
              ),
              semaphore.withPermits(1),
            ),
        };
      }),
  );

/**
 * Reject an operation input the operation's own schema does not admit, naming the offending value.
 *
 * The excess-property check is deliberately top-level only: a misspelled field is the mistake worth
 * catching, and an in-process caller legitimately passes a LIVE ECHO object as a property value,
 * which carries internal keys no declared schema lists. `reportInput` and `errors: 'all'` put the
 * rejected value and every bad field in the message, since a remote caller cannot see its own
 * payload in our logs.
 */
const validateOperationInput = <const Op extends Operation.Definition.Any>(
  op: Op,
  input: unknown,
): Effect.Effect<void> => {
  // An input schema that describes no shape cannot say what an excess property would be, and a
  // caller handing a payload to an operation declaring `Void` is the trigger dispatcher's normal
  // contract. `Null` is in the set because a `Void` input comes back as `Null` once the operation
  // has round-tripped through its serialized schema, which is how the dispatcher rebuilds it.
  const typeAst = Schema.toType(op.input).ast;
  if (CONTENTLESS_INPUT_TAGS.has(typeAst._tag)) {
    return Effect.void;
  }

  const fail = (message: string, cause?: unknown) =>
    new InvalidOperationInputError({
      message: `Operation input did not match schema (${op.meta.key}): ${message}`,
      cause,
    });

  // Invoking with no arguments is how a skill template and the trigger dispatcher call an operation
  // whose fields are all optional, so a nullish payload is validated as the empty object it stands
  // for rather than rejected outright; a schema that does require fields still names them.
  const payload = input ?? (SchemaAST.isObjects(typeAst) ? {} : input);

  return Effect.suspend(() => {
    const undeclared = undeclaredTopLevelKeys(typeAst, payload);
    if (undeclared.length > 0) {
      return Effect.die(
        fail(`unexpected ${undeclared.length === 1 ? 'property' : 'properties'} ${undeclared.join(', ')}`),
      );
    }

    return Effect.try({
      try: () => Schema.decodeUnknownSync(Schema.toType(op.input), { reportInput: true, errors: 'all' })(payload),
      catch: (error: any) => fail(error?.message ?? String(error), error),
    }).pipe(Effect.asVoid, Effect.orDie);
  });
};

/** Own keys of a struct input that the schema does not declare; empty for any other input shape. */
const undeclaredTopLevelKeys = (typeAst: SchemaAST.AST, input: unknown): string[] => {
  if (!SchemaAST.isObjects(typeAst) || typeof input !== 'object' || input === null || Array.isArray(input)) {
    return [];
  }
  // An index signature makes every key declared, so there is nothing to reject.
  if (typeAst.indexSignatures.length > 0) {
    return [];
  }

  const declared = new Set(SchemaAST.getPropertySignatures(typeAst).map((prop) => prop.name.toString()));
  return Object.keys(input).filter((key) => !declared.has(key));
};

const CONTENTLESS_INPUT_TAGS: ReadonlySet<string> = new Set(['Any', 'Unknown', 'Void', 'Undefined', 'Null', 'Never']);
