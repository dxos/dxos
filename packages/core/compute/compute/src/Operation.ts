//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as PubSub from 'effect/PubSub';
import * as Ref$ from 'effect/Ref';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';
import * as Schema$ from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import * as Struct from 'effect/Struct';
import * as Tracer from 'effect/Tracer';
import type * as Types from 'effect/Types';

import { Annotation, type Database, DXN, JsonSchema, type Key, Migration, Obj, Ref, Type } from '@dxos/echo';
import { EffectEx, SpanAttributes } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import type { URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { type NoHandlerError, RunAgainError } from './errors.ts';
import type { Operation } from './index.ts';
import type * as Process from './Process.ts';
import type * as StorageService from './StorageService.ts';
import type * as Trace from './Trace.ts';

/**
 * Schema type that accepts any Encoded form but requires no Context.
 * This allows ECHO object schemas where Type !== Encoded due to [KindId] symbol.
 */
type Schema<T> = Schema$.Codec<T, any, never, never>;

export const DefinitionTypeId = '~@dxos/operation/OperationDefinition' as const;
export type DefinitionTypeId = typeof DefinitionTypeId;

/**
 * Serializable definition of an Operation.
 * Contains schema and metadata, but no runtime logic.
 */
export interface Definition<I, O, S = any> extends Pipeable.Pipeable, Definition.Variance<I, O, S> {
  /**
   * Input schema for the operation.
   */
  readonly input: Schema<I>;
  /**
   * Output schema for the operation.
   */
  readonly output: Schema<O>;

  readonly meta: {
    readonly key: DXN.DXN;
    readonly name?: string;
    readonly version?: string;
    readonly description?: string;
    /**
     * Phosphor icon identifier in `ph--<name>--<variant>` format (e.g. `ph--file-text--regular`).
     */
    readonly icon?: string;
    /**
     * Deployment ID for remote invocation.
     * Assigned by the EDGE function service when deployed.
     */
    readonly deployedId?: string;

    /**
     * Dictionary of annotations for the operation.
     */
    // TODO(dmaretskyi): Make required, but this complicates `make` to fill in defaults.
    readonly annotations?: Annotation.Dictionary;

    /**
     * When true, this operation is not serialized into the hypergraph registry.
     * Use for UI-only operations that should not be discoverable by the AI agent.
     */
    readonly skipRegistry?: boolean;
  };

  /**
   * Execution mode for the operation.
   * - 'sync': Operation completes synchronously (fast, UI-blocking acceptable).
   * - 'async': Operation may take time (should not block UI).
   */
  readonly executionMode: 'sync' | 'async';

  /**
   * ECHO types the operation uses.
   * Ensures types are available when the operation is executed remotely.
   */
  readonly types: readonly Type.AnyEntity[];

  /**
   * Effect services required by this operation.
   * These services will be automatically provided to the handler at invocation time.
   */
  readonly services: readonly Context.Key<S, unknown>[];
}

/**
 * Namespace for OperationDefinition helper types.
 */
export declare namespace Definition {
  export interface Variance<I, O, S> {
    [DefinitionTypeId]: {
      readonly _Input: Types.Contravariant<I>;
      readonly _Output: Types.Covariant<O>;
      readonly _Services: Types.Covariant<S>;
    };
  }

  /**
   * Any operation definition, regardless of input/output types.
   */
  export type Any = Definition<any, any, any>;

  /**
   * Extract the input type from an operation definition.
   */
  export type Input<T extends Any> = T extends Variance<infer I, infer _O, infer _S> ? I : never;

  /**
   * Extract the output type from an operation definition.
   */
  export type Output<T extends Any> = T extends Variance<infer _I, infer O, infer _S> ? O : never;

  /**
   * Extract the service identifier types from an operation's services array.
   * Returns `never` if the operation has no services declared.
   */
  export type Services<T extends Any> = T extends Variance<infer _I, infer _O, infer S> ? S : never;

  export type HandlerType<T extends Any> =
    T extends Variance<infer I, infer O, infer S> ? Handler<I, O, any, S> : never;
}

/**
 * Runtime handler for an Operation.
 */
export type Handler<I, O, E = Error, R = never> = (input: I) => Effect.Effect<O, E, R>;

export type WithHandler<T extends Definition.Any> = T & {
  handler: Definition.HandlerType<T>;
};

export const LazyHandlerTypeId = '~@dxos/operation/LazyHandler' as const;
export type LazyHandlerTypeId = typeof LazyHandlerTypeId;

/**
 * A definition paired with the module that implements it. The pairing is TYPED — the loaded
 * module's default must be `WithHandler<Def>` for the same `Def` — so a definition can no longer be
 * wired to another operation's handler and fail only at dispatch.
 */
export interface LazyHandler<Def extends Definition.Any = Definition.Any> {
  readonly [LazyHandlerTypeId]: LazyHandlerTypeId;
  readonly definition: Def;
  readonly load: () => Promise<{ default: WithHandler<Def> }>;
}

/** Whether a value is a {@link LazyHandler}. */
export const isLazyHandler = (value: unknown): value is LazyHandler =>
  typeof value === 'object' && value !== null && LazyHandlerTypeId in value;

/**
 * Pairs a definition with a lazily-imported handler module, keeping the handler body out of the
 * static graph while checking that it implements THIS definition.
 *
 * @example
 * ```ts
 * GetBlueskyTargets.pipe(Operation.lazyHandler(() => import('./get-bluesky-targets')))
 * ```
 */
export const lazyHandler: {
  <Def extends Definition<any, any>>(load: () => Promise<{ default: WithHandler<Def> }>): (op: Def) => LazyHandler<Def>;
  <Def extends Definition<any, any>>(op: Def, load: () => Promise<{ default: WithHandler<Def> }>): LazyHandler<Def>;
} = (<Def extends Definition<any, any>>(
  opOrLoad: Def | (() => Promise<{ default: WithHandler<Def> }>),
  load?: () => Promise<{ default: WithHandler<Def> }>,
) => {
  const make = (op: Def, loader: () => Promise<{ default: WithHandler<Def> }>): LazyHandler<Def> => ({
    [LazyHandlerTypeId]: LazyHandlerTypeId,
    definition: op,
    load: loader,
  });
  return load === undefined
    ? (op: Def) => make(op, opOrLoad as () => Promise<{ default: WithHandler<Def> }>)
    : make(opOrLoad as Def, load);
}) as any;

/**
 * Checks if a value is an operation definition.
 */
export const isOperationDefinition = (value: unknown): value is Definition.Any => {
  return typeof value === 'object' && value !== null && DefinitionTypeId in value;
};

/**
 * Checks if a value is an operation with a handler.
 */
export const isOperationWithHandler = (value: unknown): value is WithHandler<Definition.Any> => {
  return isOperationDefinition(value) && 'handler' in value;
};

/**
 * Props for creating an Operation definition.
 * Derived from OperationDefinition with executionMode made optional (defaults to 'async').
 */
export type Props<I, O> = Omit<Definition<I, O>, DefinitionTypeId | 'pipe' | 'executionMode' | 'types' | 'services'> & {
  readonly executionMode?: 'sync' | 'async';
  readonly types?: Definition<I, O>['types'];
  readonly services?: Definition<I, O>['services'];
};

/**
 * Creates a new Operation definition.
 * Applies default executionMode of 'async' if not specified.
 * The returned type preserves the literal types of props (including services).
 */
export const make = <const P extends Types.NoExcessProperties<Props<any, any>, P>>(
  props: P,
): Definition<
  Schema$.Schema.Type<P['input']>,
  Schema$.Schema.Type<P['output']>,
  Context.Service.Identifier<NonNullable<P['services']>[number]>
> => {
  return {
    [DefinitionTypeId]: {},
    ...props,
    executionMode: props.executionMode ?? 'async',
    types: props.types ?? [],
    services: props.services ?? [],
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return Pipeable.pipeArguments(this, arguments);
    },
  } as any;
};

/**
 * Attaches a handler to an Operation definition.
 * The handler may use any services declared in the operation, plus Operation.Service (always available).
 * Dual API: can be called directly or used in a pipe.
 *
 * @example
 * ```ts
 * const MyOp = Operation.make({
 *   input: Schema.Void,
 *   output: Schema.Void,
 *   meta: { key: 'my-op' },
 *   services: [DatabaseService],
 * });
 *
 * // Direct call - handler can use DatabaseService
 * const op = Operation.withHandler(MyOp, (input) =>
 *   Effect.gen(function* () {
 *     const db = yield* DatabaseService;
 *     return {};
 *   }),
 * );
 *
 * // Piped call
 * const op = MyOp.pipe(Operation.withHandler((input) => Effect.succeed({})));
 * ```
 */
export const withHandler: {
  <Def extends Definition<any, any>, E = never>(
    handler: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def> | Service>,
  ): (op: Def) => WithHandler<Def>;
  <Def extends Definition<any, any>, E = never>(
    op: Def,
    handler: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def> | Service>,
  ): WithHandler<Def>;
} = <Def extends Definition<any, any>, E = never>(
  opOrHandler: Def | Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def> | Service>,
  handler?: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def> | Service>,
): WithHandler<Def> => {
  // If called with just handler (piped usage).
  if (handler === undefined) {
    const handlerFn = opOrHandler as Handler<
      Definition.Input<Def>,
      Definition.Output<Def>,
      E,
      Definition.Services<Def> | Service
    >;
    return ((op: Def) => ({
      ...op,
      handler: handlerFn,
    })) as any;
  }

  // If called with both op and handler (direct usage).
  const op = opOrHandler as Def;
  return {
    ...op,
    handler,
  } as any;
};

/**
 * Helper to make the handler type opaque.
 * Workaround for TypeScript's inability to infer the handler type from the operation definition:
 * ```
 * error TS2742: The inferred type of 'default' cannot be named without a reference.
 * ```
 *
 * Most of the time the exact handler type is not needed.
 *
 * @example
 * ```ts
 * const MyOp = Operation.make({
 *   input: Schema.Void,
 *   output: Schema.Void,
 *   meta: { key: 'my-op' },
 *   services: [DatabaseService],
 * });
 *
 * export default MyOp.pipe(
 *   Operation.withHandler(
 *     Effect.fn(function* (input) {
 *       return { result: 'ok' };
 *     }),
 *   ),
 *   Operation.opaqueHandler,
 * );
 * ```
 */
export const opaqueHandler = <T extends Operation.Definition.Any>(
  handler: Operation.WithHandler<T>,
): Operation.WithHandler<Operation.Definition.Any> => handler;

//
// Durable operations.
//

/**
 * Handler of a durable operation: the callbacks of one running process instance.
 *
 * Process lifecycle: Initial -> Running <-> Suspended -> Terminated.
 *
 * - onSpawn -> called once when the process is spawned.
 * - onInput -> called for every input submitted to the process.
 * - onAlarm -> called for processes scheduling alarms.
 * - onChildEvent -> called when child process produces output or exits.
 */
export interface DurableHandler<_Input, _Output, _Requirements, _Rpcs extends Rpc.Any> {
  /**
   * Called when the process is spawned.
   * Not called for processes that are resumed from a previously suspended state.
   *
   * @returns A signal indicating to the runtime whether the process is finished, or should be resumed later.
   * @throws Throwing in the handler will terminate the process with an error.
   *
   * Note: This function should aim to complete in under 5 seconds to avoid exceeding limits in serverless environments.
   */
  onSpawn(): Effect.Effect<void, never, _Requirements | BaseServices>;

  /**
   * Called when there's input available to process.
   *
   * The function can be called in parallel.
   *
   * @returns A signal indicating to the runtime whether the process is finished, or should be resumed later.
   * @throws Throwing in the handler will terminate the process with an error.
   *
   * Note: This function should aim to complete in under 5 seconds to avoid exceeding limits in serverless environments.
   */
  onInput(input: _Input): Effect.Effect<void, never, _Requirements | BaseServices>;

  /**
   * Called when the process's alarm is triggered.
   *
   * @throws Throwing in the handler will terminate the process with an error.
   */
  onAlarm(): Effect.Effect<void, never, _Requirements | BaseServices>;

  /**
   * Called when the process's child process produces output or exits.
   *
   * This allows the parent process to hibernate while a long-running child process is running.
   */
  onChildEvent(event: ChildEvent<unknown>): Effect.Effect<void, never, _Requirements | BaseServices>;

  /**
   * Handlers for the RPCs provided by the process.
   */
  rpcHandlers: Context.Context<Rpc.ToHandler<_Rpcs>>;
}

/**
 * Services that are always available to all processes.
 * Provided unconditionally by the runtime, so handlers may use them without declaring them
 * in {@link DurableProps.services}.
 */
export type BaseServices = Trace.TraceService | StorageService.StorageService;

export type ChildEvent<T> =
  | {
      readonly _tag: 'output';
      readonly pid: Process.ID;
      readonly data: T;
    }
  | {
      readonly _tag: 'exited';
      readonly pid: Process.ID;
      readonly result: Exit.Exit<void>;
    };

/**
 * Runtime context handed to a durable operation's `create`.
 */
export interface DurableContext<I, O> {
  readonly id: Process.ID;

  /**
   * Parameters assigned during process creation.
   */
  readonly params: Process.Params;

  /**
   * Complete this process with sucessful result.
   * No additional events will be pushed to the process.
   */
  succeed(): void;

  /**
   * Complete this process with an error.
   * No additional events will be pushed to the process.
   */
  fail(error: Error): void;

  /**
   * Submit output of the process.
   */
  submitOutput(output: O): void;

  /**
   * Set an alarm for the process to be woken up later. `onAlarm` runs with the process's own
   * context, not the caller's: an alarm scheduled from inside a handler does not nest under it.
   *
   * @param timeout - Optional timeout in milliseconds. If not provided, the process is woken up as soon as possible.
   */
  setAlarm(timeout?: number): Effect.Effect<void>;
}

export const DurableDefinitionTypeId = '~@dxos/operation/DurableDefinition' as const;
export type DurableDefinitionTypeId = typeof DurableDefinitionTypeId;

/**
 * Declaration of a durable operation, without its handler.
 * Created by {@link makeDurable}; {@link withDurableHandler} attaches the handler factory to produce a {@link Durable}.
 */
export interface DurableDefinition<_Input, _Output, _Requirements = never, _Rpcs extends Rpc.Any = never>
  extends Pipeable.Pipeable, DurableDefinition.Variance<_Input, _Output, _Requirements, _Rpcs> {
  /**
   * Unique identifier for the executable in the reverse DNS format.
   */
  readonly key: string;

  /**
   * Human-readable label, when provided.
   */
  readonly name?: string;

  readonly services: readonly Context.Key<any, any>[];

  /**
   * Codecs for the process's inputs and outputs, from {@link DurableProps}. Exposed on the
   * interface so a caller that moves a value across a boundary (a remote runtime) can encode it
   * with the definition's own schema rather than assuming the value is already JSON.
   */
  readonly input: Schema.Codec<_Input, any>;
  readonly output: Schema.Codec<_Output, any>;

  /** Schemas to register with the process's database; see {@link DurableProps.types}. */
  readonly types?: readonly Type.AnyEntity[];

  // Runtime RPC group, stored as `any`. `RpcGroup`/`RpcClient` are invariant in their type
  // argument (and `DurableHandler.rpcHandlers` is contravariant in it), so referencing `_Rpcs` in the
  // structural fields would block `Durable<…, never>` from being assignable to `Durable.Any`.
  // The precise group is carried by the covariant `Variance` phantom and recovered at `spawn`.
  // See design spec §4.4.
  readonly rpcs: RpcGroup.RpcGroup<any>;
}

export declare namespace DurableDefinition {
  export interface Variance<_Input, _Output, _Requirements, _Rpcs> {
    readonly [DurableDefinitionTypeId]: {
      readonly _Input: Types.Contravariant<_Input>;
      readonly _Output: Types.Covariant<_Output>;
      readonly _Requirements: Types.Covariant<_Requirements>;

      // Phantom-covariant: lets `never`-RPC processes stay assignable to `Durable.Any` while
      // `spawn` still recovers the precise group from this slot. See design spec §4.4.
      readonly _Rpcs: Types.Covariant<_Rpcs>;
    };
  }

  export type Any = DurableDefinition<any, any, any, any>;

  export type Input<T extends Any> = T extends Variance<infer I, infer _O, infer _R, infer _P> ? I : never;
  export type Output<T extends Any> = T extends Variance<infer _I, infer O, infer _R, infer _P> ? O : never;
  export type Requirements<T extends Any> = T extends Variance<infer _I, infer _O, infer R, infer _P> ? R : never;
  export type Rpcs<T extends Any> =
    T extends Variance<infer _I, infer _O, infer _R, infer P extends Rpc.Any> ? P : never;

  /**
   * The handler factory {@link withDurableHandler} accepts for a definition: callbacks may be omitted and default to no-ops.
   */
  export type Create<T extends Any> = (
    ctx: DurableContext<Input<T>, Output<T>>,
  ) => Effect.Effect<
    Partial<DurableHandler<Input<T>, Output<T>, Requirements<T>, Rpcs<T>>>,
    never,
    Requirements<T> | BaseServices | Scope.Scope
  >;

  /**
   * The durable operation produced by attaching a handler to a definition.
   */
  export type WithHandler<T extends Any> = Durable<Input<T>, Output<T>, Requirements<T>, Rpcs<T>>;
}

export const DurableTypeId = '~@dxos/operation/Durable' as const;
export type DurableTypeId = typeof DurableTypeId;

/**
 * A durable operation: declaration plus a handler factory, run by a process runtime.
 * Can be instantiated multiple times to produce new process instances with separate state and handlers.
 * `create` is used to instantiate a new process.
 * Can store runtime state in scope of `create` function.
 */
export interface Durable<_Input, _Output, _Requirements = never, _Rpcs extends Rpc.Any = never>
  extends
    DurableDefinition<_Input, _Output, _Requirements, _Rpcs>,
    Durable.Variance<_Input, _Output, _Requirements, _Rpcs> {
  /**
   * Create a new instance of the process.
   */
  create(
    ctx: DurableContext<_Input, _Output>,
  ): Effect.Effect<
    DurableHandler<_Input, _Output, _Requirements, any>,
    never,
    _Requirements | BaseServices | Scope.Scope
  >;
}

export const isDurableDefinition = (value: unknown): value is DurableDefinition.Any =>
  typeof value === 'object' && value !== null && DurableDefinitionTypeId in value;

export const isDurable = (executable: unknown): executable is Durable.Any =>
  typeof executable === 'object' && executable !== null && DurableTypeId in executable;

export namespace Durable {
  export interface Variance<_Input, _Output, _Requirements, _Rpcs> {
    readonly [DurableTypeId]: {
      readonly _Input: Types.Contravariant<_Input>;
      readonly _Output: Types.Covariant<_Output>;
      readonly _Requirements: Types.Covariant<_Requirements>;
      readonly _Rpcs: Types.Covariant<_Rpcs>;
    };
  }

  export type Any = Durable<any, any, any, any>;
}

export interface DurableProps {
  /**
   * Unique identifier for the process in the reverse DNS format.
   */
  readonly key: string;

  readonly input: Schema.Codec<any, any>;
  readonly output: Schema.Codec<any, any>;
  readonly services: readonly Context.Key<any, any>[];
  readonly rpcs?: RpcGroup.RpcGroup<any>;

  /**
   * Schemas the process's own data model needs, registered with its database at spawn.
   *
   * Declared here beside `services` because a host cannot know them: it resolves a process by key
   * and has no view of the types that process queries. Unregistered, a TYPED query silently matches
   * nothing — a queue append succeeds and the read back returns empty, which reads as a lost write
   * rather than a missing schema.
   */
  readonly types?: readonly Type.AnyEntity[];
}

/**
 * Declares a durable operation; attach its handler factory with {@link withDurableHandler}.
 *
 * @example
 * ```ts
 * const Counter = Operation.makeDurable({ key: 'example.counter', input: Schema.Number, output: Schema.Number, services: [] }).pipe(
 *   Operation.withDurableHandler((ctx) =>
 *     Effect.succeed({ onInput: (input) => Effect.sync(() => ctx.submitOutput(input + 1)) }),
 *   ),
 * );
 * ```
 */
export const makeDurable = <const Opts extends Types.NoExcessProperties<DurableProps, Opts>>(
  opts: Opts,
): DurableDefinition<
  Schema.Schema.Type<Opts['input']>,
  Schema.Schema.Type<Opts['output']>,
  Context.Service.Identifier<NonNullable<Opts['services']>[number]>,
  RpcGroup.Rpcs<Opts['rpcs']>
> => {
  assertArgument(/^[a-z0-9]([a-z0-9.\-/]*[a-z0-9])?$/i.test(opts.key), 'key', 'Invalid key');
  return {
    [DurableDefinitionTypeId]: {} as any,
    ...opts,
    rpcs: opts.rpcs ?? RpcGroup.make(),
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return Pipeable.pipeArguments(this, arguments);
    },
  };
};

/**
 * Attaches the handler factory to a durable operation definition.
 * Dual API: can be called directly or used in a pipe.
 */
export const withDurableHandler: {
  <Def extends DurableDefinition.Any>(
    create: DurableDefinition.Create<Def>,
  ): (def: Def) => DurableDefinition.WithHandler<Def>;
  <Def extends DurableDefinition.Any>(
    def: Def,
    create: DurableDefinition.Create<Def>,
  ): DurableDefinition.WithHandler<Def>;
} = Function.dual(2, <Def extends DurableDefinition.Any>(def: Def, create: DurableDefinition.Create<Def>) =>
  attachDurableHandler(def, create),
);

const attachDurableHandler = <Def extends DurableDefinition.Any>(
  def: Def,
  create: DurableDefinition.Create<Def>,
): DurableDefinition.WithHandler<Def> => ({
  ...def,
  [DurableTypeId]: {} as any,
  create: (ctx) =>
    create(ctx).pipe(
      Effect.map((partial) => ({
        onSpawn: () => Effect.void,
        onInput: () => Effect.void,
        onAlarm: () => Effect.void,
        onChildEvent: () => Effect.void,
        ...partial,
        rpcHandlers: sanitizeRpcs(def.rpcs, partial.rpcHandlers),
      })),
    ),
});

// Returns `Context.Context<any>`: the runtime handler bag is stored untyped because
// `DurableHandler.rpcHandlers` is contravariant in `_Rpcs` (see design spec §4.4); the precise
// handler contract is enforced by `withDurableHandler`'s `create` parameter, not by this internal helper.
const sanitizeRpcs = <Rpcs extends Rpc.Any>(
  defined: RpcGroup.RpcGroup<Rpcs> | undefined,
  provided: Context.Context<Rpc.ToHandler<Rpcs>> | undefined,
): Context.Context<any> => {
  // Handlers are required only when a non-empty RPC group is declared.
  const needsRpcs = defined !== undefined && defined.requests.size > 0;
  if (!needsRpcs) {
    // `Context.empty()` is `Context<never>`; `Context`'s requirement parameter is contravariant,
    // so the empty (no-handler) context needs widening to the untyped bag.
    return provided ?? (Context.empty() as Context.Context<any>);
  }
  if (!provided) {
    throw new TypeError('Durable operation declared RPCs but did not provide any handlers');
  }
  return provided;
};

//
// Tool projection
//

/**
 * Constant namespace prefix elided from tool names; keys outside it (examples, third-party) keep every segment.
 */
const TOOL_NAME_KEY_PREFIX = 'org.dxos.operation.';

/**
 * Derives the model-facing tool name for an operation from its DXN key — never from `meta.name`,
 * which is display copy and must stay freely editable without renaming the tool the model calls.
 * The key's namespace segment prefixes the name, which is what removes the cross-skill collisions
 * that a bare verb produced (three skills each claimed `create`).
 *
 * The mapping is not injective: kebab-casing makes a camelCase segment and an already-hyphenated one
 * converge, so `webSearch` and `web-search` both yield `web-search`, and hyphenated segments are in
 * live keys (`plugin-crm`, `web-search`). Registry-key uniqueness therefore does not by itself
 * guarantee tool-name uniqueness. Two such keys are an authoring error, caught in the two places both
 * keys are visible at once: {@link findToolNameCollisions} over a whole set, and the tool resolver.
 *
 * @example `org.dxos.operation.markdown.create` → `markdown-create`
 * @example `org.dxos.operation.assistantToolkit.addArtifact` → `assistant-toolkit-add-artifact`
 */
export const toolName = (op: Definition.Any): string => toolNameFromKey(op.meta.key);

/**
 * {@link toolName} for a raw registry key (a DXN or bare NSID), e.g. a persisted record's meta key.
 */
export const toolNameFromKey = (key: string): string => {
  const name = deriveToolName(key);
  invariant(TOOL_NAME_REGEXP.test(name), `Invalid tool name: ${name}`);
  return name;
};

/** Shape every derived tool name must have — the model-facing identifier contract. */
const TOOL_NAME_REGEXP = /^[a-z][a-z0-9-_]*$/;

const deriveToolName = (key: string): string => {
  const nsid = DXN.isDXN(key) ? DXN.getName(key) : key;
  const stripped = nsid.startsWith(TOOL_NAME_KEY_PREFIX) ? nsid.slice(TOOL_NAME_KEY_PREFIX.length) : nsid;
  return stripped.split('.').map(kebabCase).join('-');
};

const kebabCase = (segment: string): string => segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * {@link toolNameFromKey} for a key that is not known to be well-formed — a record off the wire, whose
 * `@meta.key` is untrusted JSON. Returns undefined instead of failing, so one malformed entry costs its
 * own tool rather than every tool in the projection.
 */
export const tryToolNameFromKey = (key: string): string | undefined => {
  const name = deriveToolName(key);
  return TOOL_NAME_REGEXP.test(name) ? name : undefined;
};

/**
 * Groups a set of operations by derived tool name, returning only the names claimed more than once.
 *
 * {@link toolName} is not injective (see its note), so a set of registry-unique keys can still
 * collide. Call this wherever a complete operation set is assembled — the resolver sees keys one at a
 * time and can only catch a collision once a colliding name is actually requested.
 */
export const findToolNameCollisions = (operations: readonly Definition.Any[]): Map<string, readonly DXN.DXN[]> => {
  // Keyed by key, not by occurrence: one operation bound by two skills is the same tool, not a clash.
  const byName = new Map<string, Set<DXN.DXN>>();
  for (const op of operations) {
    const name = toolName(op);
    byName.set(name, (byName.get(name) ?? new Set()).add(op.meta.key));
  }
  return new Map([...byName].filter(([, keys]) => keys.size > 1).map(([name, keys]) => [name, [...keys]]));
};

//
// Invocation Interfaces
//

/**
 * Local invocation of an operation.
 */
export type Invoke = <I, O, E>(op: Definition<I, O>, input: I) => Effect.Effect<O, E>;

/**
 * Remote invocation of an operation.
 */
export type InvokeRemote = <I, O, E>(
  op: Definition<I, O>,
  input: I,
  options?: { timeout?: number },
) => Effect.Effect<O, E>;

/**
 * Database record of an operation.
 * The registry `key` and `version` live in the object meta — access via
 * `Obj.getMeta(record).key` and `Obj.getMeta(record).version`.
 */
// TODO(dmaretskyi): Keep typename as 'org.dxos.type.function' (not 'operation') to maintain
//  backward compatibility with existing data and avoid requiring data migration.
export class PersistentOperation extends Type.makeObject<PersistentOperation>(
  DXN.make('org.dxos.type.function', '0.2.0'),
)(
  Schema$.Struct({
    name: Schema$.NonEmptyString,

    description: Schema$.optional(Schema$.String),

    /**
     * ISO date string of the last deployment.
     */
    updated: Schema$.optional(Schema$.String),

    // Reference to a source script if it exists within ECHO.
    // TODO(burdon): Don't ref ScriptType directly (core).
    source: Schema$.optional(Ref.Ref(Obj.Unknown)),

    inputSchema: Schema$.optional(JsonSchema.JsonSchema),
    outputSchema: Schema$.optional(JsonSchema.JsonSchema),

    /**
     * List of required services.
     * Match the Context.Tag keys of the services the operation handler declares.
     */
    services: Schema$.optional(Schema$.Array(Schema$.String)),

    // Local binding to a function name.
    // TODO(dmaretskyi): Add this field to Operation.Definition.
    binding: Schema$.optional(Schema$.String),

    /**
     * Phosphor icon identifier in `ph--<name>--<variant>` format (e.g. `ph--file-text--regular`).
     */
    icon: Schema$.optional(Schema$.String),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--function--regular', hue: 'blue' }),
  ),
) {}

const FUNCTION_META_KEY = 'org.dxos.service.function';

/**
 * Get the registry key for a persistent operation record (from the object meta).
 */
export const getKey = (record: PersistentOperation): string | undefined => Obj.getMeta(record).key;

/**
 * Get the registry version for a persistent operation record (from the object meta).
 */
export const getVersion = (record: PersistentOperation): string | undefined => Obj.getMeta(record).version;

/**
 * Serialize an operation definition to a persistent operation record.
 */
export const serialize = (operation: Definition.Any): PersistentOperation => {
  return Obj.make(PersistentOperation, {
    [Obj.Meta]: {
      key: operation.meta.key,
      version: operation.meta.version ?? '0.0.0',
      keys: operation.meta.deployedId ? [{ source: FUNCTION_META_KEY, id: operation.meta.deployedId }] : [],
      annotations: operation.meta.annotations,
    },
    name: operation.meta.name ?? '',
    description: operation.meta.description,
    icon: operation.meta.icon,
    updated: undefined,
    source: undefined,
    inputSchema: JsonSchema.toJsonSchema(operation.input),
    outputSchema: JsonSchema.toJsonSchema(operation.output),
    services: operation.services.map((service) => service.key),
  });
};

/**
 * Serializes each definition, dropping any whose schema cannot render as JSON Schema, so one
 * unserializable operation (e.g. `space.importSpace`) does not fail registry population for every
 * other.
 */
export const serializable = (operations: readonly Definition.Any[]): PersistentOperation[] =>
  operations.flatMap((operation) => {
    try {
      return [serialize(operation)];
    } catch (error) {
      log.verbose('operation is not serializable; excluded from the registry', {
        key: String(operation.meta.key),
        error: String(error),
      });
      return [];
    }
  });

/**
 * Deserialize a persistent operation record to an operation definition.
 */
export const deserialize = (record: PersistentOperation): Definition.Any => {
  const meta = Obj.getMeta(record);
  // Extract deployed function ID from ECHO meta keys (matches FUNCTIONS_META_KEY in @dxos/functions).
  const deployedId = meta.keys.find((key) => key.source === FUNCTION_META_KEY)?.id;
  return make({
    input: record.inputSchema ? JsonSchema.toEffectSchema(record.inputSchema) : Schema$.Unknown,
    output: record.outputSchema ? JsonSchema.toEffectSchema(record.outputSchema) : Schema$.Unknown,
    services: record.services?.map((service) => Context.Service(service)) ?? [],
    executionMode: 'async',
    types: [],
    meta: {
      key: DXN.tryMake(meta.key ?? record.name) ?? DXN.make(meta.key ?? record.name),
      name: record.name,
      version: meta.version ?? '0.0.0',
      description: record.description,
      icon: record.icon,
      deployedId,
      annotations: meta.annotations ?? {},
    },
  });
};

/**
 * Update properties on the target operation record from the source operation record.
 */
export const setFrom = (target: PersistentOperation, source: PersistentOperation) => {
  Obj.update(target, (target) => {
    target.name = source.name ?? target.name;
    target.description = source.description;
    target.icon = source.icon;
    target.updated = source.updated;
    // TODO(dmaretskyi): A workaround for an ECHO bug.
    target.inputSchema = source.inputSchema ? JSON.parse(JSON.stringify(source.inputSchema)) : undefined;
    target.outputSchema = source.outputSchema ? JSON.parse(JSON.stringify(source.outputSchema)) : undefined;
    const sourceMeta = Obj.getMeta(source);
    const targetMeta = Obj.getMeta(target);
    targetMeta.key = sourceMeta.key ?? targetMeta.key;
    targetMeta.version = sourceMeta.version;
    // Only overwrite foreign keys when the source actually carries them; otherwise we'd wipe
    // bindings (e.g. the deployedId set by `deserialize`) on records produced by `serialize`.
    if (sourceMeta.keys.length > 0) {
      targetMeta.keys = JSON.parse(JSON.stringify(sourceMeta.keys));
    }
    targetMeta.annotations = sourceMeta.annotations ?? targetMeta.annotations;
  });
};

/**
 * Translatable label — a plain string or an i18next-style `[key, options]` tuple.
 * Defined locally to avoid a core dependency on UI translation packages; structurally compatible with
 * the app-level `Label` type so values flow into UI toasts unchanged.
 */
export const Label = Schema.Union([
  Schema.String,
  // `Schema.mutable` mirrors the app-level `Label` (whose tuple is mutable), so decoded values are
  // assignable to UI toast `title`/`label` slots without a readonly-vs-mutable tuple mismatch.
  Schema.mutable(
    Schema.Tuple([
      Schema.String,
      Schema.Struct({
        ns: Schema.String,
        count: Schema.optional(Schema.Number),
        defaultValue: Schema.optional(Schema.String),
      }).mapFields(Struct.map(Schema.mutableKey)),
    ]),
  ),
]);
export type Label = Schema.Schema.Type<typeof Label>;

/**
 * Per-phase user notification messages for an invocation.
 * A phase is notified to the user iff its message is provided; messages are translatable {@link Label}s.
 */
export const NotifyOptions = Schema.Struct({
  /** Shown when the invocation starts. */
  start: Schema.optional(Label),
  /** Shown when the invocation succeeds. */
  success: Schema.optional(Label),
  /** Shown when the invocation fails. */
  error: Schema.optional(Label),
});
export type NotifyOptions = Schema.Schema.Type<typeof NotifyOptions>;

/**
 * Annotation that configures the process to notify the user at the given invocation phases.
 */
export const NotifyOptionsAnnotation = Annotation.make({
  id: 'org.dxos.operation.notify-options',
  schema: NotifyOptions,
});

/**
 * A serializable reference to an operation invocation — the target operation's key plus its input.
 * Describes a deferred/late-bound invocation that must survive a serialization boundary (e.g. riding
 * on a process-failure error, or persisted) where a live {@link Definition} cannot. Resolve the key
 * with `OperationHandlerSet.getHandlerByKey` and hand the result to the invoker. Carries no functions,
 * so `input` must itself be serializable.
 */
export interface SerializedInvocation {
  /** Target operation key as a URI (a DXN, e.g. `dxn:org.dxos.plugin.deck.operation.open`). */
  readonly operation: URI.URI;
  /** Input passed to the operation; must be serializable. */
  readonly input?: unknown;
}

/**
 * Builds a {@link SerializedInvocation} from a live {@link Definition} and its input — the serializable
 * counterpart to a direct `invoke`, for describing an invocation that must cross a serialization
 * boundary (e.g. a deferred toast action). Resolve it later with `OperationHandlerSet.getHandlerByKey`.
 */
export const prepare = <I, O>(operation: Definition<I, O>, input: I): SerializedInvocation => ({
  operation: operation.meta.key,
  input,
});

/**
 * Options for operation invocation.
 */
export interface InvokeOptions {
  /**
   * Space ID to provide database context for the handler.
   */
  spaceId?: Key.SpaceId;
  /**
   * Request user-facing notifications at the given invocation phases.
   */
  notify?: NotifyOptions;
  /**
   * URI of the conversation feed (queue) — today always an EID, but typed as
   * `URI.URI` to accommodate future entity-kind extensions. Narrow with `EID.parse`
   * at the point of use.
   * Passed to the process environment so nested operations can resolve HarnessService and related services.
   */
  conversation?: URI.URI;
  /**
   * Tracing metadata stamped on the process that runs the invocation.
   */
  tracing?: Trace.Meta;

  /**
   * Specifies the runtime environment for the operation.
   * By default, the operation is executed on the local runtime.
   */
  on?: 'edge' | 'local';
}

/**
 * Annotation that marks an operation as idempotent — safe to retry even if a previous execution
 * was interrupted mid-handler. When absent the operation is treated as non-idempotent, and the
 * process runtime will fail (rather than re-run) any handler that was interrupted.
 */
export const IdempotentAnnotation = Annotation.make({
  id: 'org.dxos.operation.idempotent',
  schema: Schema$.Boolean,
});

/**
 * Returns true when the operation is explicitly annotated as idempotent.
 */
export const isIdempotent = (op: Definition.Any): boolean =>
  op.meta.annotations
    ? Option.getOrElse(Annotation.getDictionary(op.meta.annotations, IdempotentAnnotation), () => false)
    : false;

/**
 * Attaches an annotation to an operation definition, returning a new definition.
 * Combinators never mutate their input — operation definitions are module-level singletons
 * shared across handler sets, skills, and the registry, so a fresh value keeps the
 * annotated definition distinct from any other reference to the original.
 *
 * Type-preserving: an annotation does not change the operation's input/output/service types, so the
 * returned definition keeps `Def` (preserving `withHandler` inference and downstream usage).
 */
export const annotate =
  <T>(annotation: Annotation.Annotation<T>, value: T) =>
  <Def extends Definition.Any>(op: Def): Def => {
    const annotations = { ...(op.meta.annotations ?? {}) };
    Annotation.setDictionary(annotations, annotation, value);
    // The spread reconstructs the same shape with only `meta.annotations` changed; the checker can't
    // track the branded variance symbol through the untyped dictionary mutation, so reassert `Def`.
    return { ...op, meta: { ...op.meta, annotations } } as Def;
  };

/**
 * Marks an operation as visible on user-facing operation surfaces (trigger/automation pickers,
 * manual invocation). Absent ⇒ internal: invoked programmatically by plugins and hidden from pickers.
 *
 * Same polarity as the schema-level `Annotation.UserType`: operations are hidden by default, since most
 * are internal plugin machinery and only a minority are user-facing.
 */
export const VisibleAnnotation = Annotation.make({
  id: 'org.dxos.operation.visible',
  schema: Schema$.Boolean,
});

/**
 * The operation's effect on state: `none` is side-effect free, `write` mutates but is not
 * irreversible, `destructive` deletes or otherwise cannot be undone. Absent ⇒ unclassified, which
 * consumers treat conservatively (an MCP client badges the tool as possibly destructive).
 */
export const MutationAnnotation = Annotation.make({
  id: 'org.dxos.operation.mutation',
  schema: Schema$.Literals(['none', 'write', 'destructive']),
});

export type Mutation = Schema$.Schema.Type<typeof MutationAnnotation.schema>;

/**
 * Pipeable combinator classifying the operation's effect on state — see {@link MutationAnnotation}.
 * Apply at the definition site: `Operation.make({ ... }).pipe(Operation.mutation('none'))`.
 */
export const mutation = (value: Mutation) => annotate(MutationAnnotation, value);

/** The operation's mutation class, or undefined when unclassified. Reads from the persisted record. */
export const getMutation = (op: PersistentOperation): Mutation | undefined =>
  Option.getOrUndefined(Annotation.get(op, MutationAnnotation));

/**
 * Pipeable combinator that marks an operation visible. Apply at the definition site:
 * `Operation.make({ ... }).pipe(Operation.visible)`.
 */
export const visible = annotate(VisibleAnnotation, true);

/**
 * Returns true when an operation is annotated as visible on user-facing surfaces (trigger/automation
 * pickers, manual invocation). Reads from the persisted operation — the form every consumer holds.
 */
export const isVisible = (op: PersistentOperation): boolean =>
  Option.getOrElse(Annotation.get(op, VisibleAnnotation), () => false);

/**
 * Pipeable combinator that marks an operation idempotent — see {@link IdempotentAnnotation}. Apply at
 * the definition site: `Operation.make({ ... }).pipe(Operation.idempotent)`.
 */
export const idempotent = annotate(IdempotentAnnotation, true);

/**
 * Operation service interface - provides unified access to operation invocation and scheduling.
 * This service is automatically provided to operation handlers.
 */
export interface OperationService {
  /**
   * Invoke an operation as an Effect.
   * Returns an Effect that resolves to the operation output.
   */
  invoke: <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => Effect.Effect<O, NoHandlerError>;

  /**
   * Schedule an operation to run as a followup.
   * The followup is tracked and won't be cancelled when the parent operation completes.
   * Returns an Effect that completes immediately after scheduling.
   */
  schedule: <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => Effect.Effect<void>;

  /**
   * Invoke an operation and return a Promise.
   * Useful for async contexts where Effect is not available.
   */
  invokePromise: <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => Promise<{ data?: O; error?: Error }>;
}

/**
 * Context tag for the Operation service.
 * Operation handlers can yield this to invoke other operations or schedule followups.
 *
 * @example
 * ```ts
 * const handler = (input) => Effect.gen(function* () {
 *   // Schedule a followup (fire and forget)
 *   yield* Operation.schedule(AnalyticsOperation, { event: 'completed' });
 *
 *   // Invoke another operation
 *   return yield* Operation.invoke(OtherOperation, { data: input.data });
 * });
 * ```
 */
// TODO(dmaretskyi): Rename Operation.Invoker
export class Service extends Context.Service<Service, OperationService>()('@dxos/operation/Service') {}

//
// Namespace functions - ergonomic access to Operation.Service methods.
//

/**
 * Invoke an operation as an Effect.
 * Yields the Operation.Service internally.
 *
 * @example
 * ```ts
 * yield* Operation.invoke(MyOperation, { data: 'test' });
 * ```
 */
export const invoke = <I, O>(
  op: Operation.Definition<I, O>,
  ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
): Effect.Effect<O, NoHandlerError, Service> =>
  Effect.flatMap(Service, (ops) => ops.invoke(op, ...(args as [I, InvokeOptions?]))).pipe(
    Effect.withSpan('Operation.invoke'),
  );

/**
 * Schedule an operation to run as a followup.
 * Yields the Operation.Service internally.
 *
 * @example
 * ```ts
 * yield* Operation.schedule(AnalyticsOperation, { event: 'completed' });
 * yield* Operation.schedule(VoidOperation); // input optional when void
 * ```
 */
export const schedule = <I, O>(
  op: Operation.Definition<I, O>,
  ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
): Effect.Effect<void, never, Service> =>
  Effect.flatMap(Service, (ops) => ops.schedule(op, ...(args as [I, InvokeOptions?]))).pipe(
    Effect.withSpan('Operation.schedule'),
  );

/**
 * Call inside an operation to stop the current invocation and have the system re-run it (e.g. a capped
 * sync run with more work left). Surfaces as a {@link RunAgainError} defect; the trigger dispatcher
 * re-queues the same event FIFO to continue. A caller invoking via `Operation.invoke` directly gets the
 * defect and does not auto-continue.
 */
export const runAgain = (): Effect.Effect<never, void> => Effect.failCauseSync(() => Cause.die(new RunAgainError()));

/**
 * Provides additional invocation options to all invocations.
 */
export const withInvocationOptions = (options: InvokeOptions): Layer.Layer<Service, never, Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const service = yield* Service;
      return Service.of({
        invoke: ((op: Operation.Definition.Any, input: any, invocationOptions: InvokeOptions) =>
          service.invoke(op, input, { ...options, ...invocationOptions })) as any,
        invokePromise: ((op: Operation.Definition.Any, input: any, invocationOptions: InvokeOptions) =>
          service.invokePromise(op, input, { ...options, ...invocationOptions })) as any,
        schedule: ((op: Operation.Definition.Any, input: any, invocationOptions: InvokeOptions) =>
          service.schedule(op, input, { ...options, ...invocationOptions })) as any,
      });
    }),
  );

//
// Process invoker.
//

/**
 * Published after an invocation through a {@link ProcessInvoker} succeeds; failures and progress are observed
 * through the process manager instead.
 */
export type InvocationEvent<I = any, O = any> = {
  operation: Definition<I, O>;
  input: I;
  output: O;
  timestamp: number;
};

/**
 * {@link OperationService} that runs every invocation as a process, plus the bookkeeping a host reads off it.
 */
export interface ProcessInvoker extends OperationService {
  /** Successful invocations. */
  readonly invocations: PubSub.PubSub<InvocationEvent>;

  /** Number of scheduled invocations not yet started. */
  readonly pendingFollowups: Effect.Effect<number>;

  /** Waits for every scheduled invocation to start. */
  readonly awaitFollowups: Effect.Effect<void>;

  /** Same as {@link invoke}: a process-backed invocation has no path that skips publishing its event. */
  readonly _invokeCore: <I, O>(
    op: Definition<I, O>,
    input: I,
    options?: InvokeOptions,
  ) => Effect.Effect<O, NoHandlerError>;
}

export interface ProcessInvokerOptions {
  /** Spawns the processes; inside a process, the one whose {@link Process.SpawnOptions.parentProcessId} defaults to it. */
  readonly manager: Process.Manager;

  /** The durable process that runs `op`. Injected because building it needs the host's operation handlers. */
  readonly toProcess: <I, O>(op: Definition<I, O>) => Durable<I, O, any>;

  /** Who the spawned processes attribute their database writes to (see `Database.Origin`). */
  readonly origin?: Database.Origin;

  /**
   * Applied beneath the caller's context: `invokePromise` starts a fresh, empty-context fiber that would
   * otherwise fall back to Effect's native tracer, whose spans never reach OpenTelemetry.
   */
  readonly tracer?: Tracer.Tracer;
}

/**
 * Creates a {@link ProcessInvoker}: each invocation spawns a process through `options.manager`, which owns
 * service resolution, storage and lifecycle. `InvokeOptions.on === 'edge'` spawns it on the EDGE runtime
 * hosting `InvokeOptions.spaceId`.
 */
export const makeProcessInvoker = ({ manager, toProcess, origin, tracer }: ProcessInvokerOptions): ProcessInvoker => {
  const withFallbackTracer = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
    tracer === undefined
      ? effect
      : effect.pipe(
          Effect.updateContext((context: Context.Context<never>) =>
            Context.merge(Context.make(Tracer.Tracer, tracer), context),
          ),
        );

  const pubsub = Effect.runSync(PubSub.unbounded<InvocationEvent>());
  const pendingCount = Effect.runSync(Ref$.make(0));
  const pendingFibers = new Set<Fiber.Fiber<any>>();

  // Scheduled invocations are detached: they stay out of the caller's child set, so a parent that does not
  // await them is neither woken by nor kept alive by their exit.
  const spawn = <I, O>(op: Definition<I, O>, input: I, options: InvokeOptions | undefined, detached: boolean) =>
    Effect.gen(function* () {
      if (options?.on === 'edge' && options.spaceId === undefined) {
        return yield* Effect.die(new Error(`Operation '${op.meta.key}' requested edge execution without a spaceId.`));
      }
      const handle = yield* manager.spawn(toProcess(op), {
        ...(detached ? { parentProcessId: undefined } : {}),
        origin,
        name: op.meta.name ? `${op.meta.name} (${op.meta.key})` : op.meta.key,
        traceMeta: options?.tracing,
        // Notifications ride the process manager: forward `notify` onto the spawned process's params.
        notify: options?.notify,
        environment: {
          ...(options?.spaceId !== undefined ? { space: options.spaceId } : {}),
          ...(options?.conversation !== undefined ? { conversation: options.conversation } : {}),
        },
        ...(options?.on === 'edge' && options.spaceId !== undefined
          ? { location: { kind: 'edge', space: options.spaceId } as const }
          : {}),
      });
      yield* handle.submitInput(input);
      log('operation process spawned', { opKey: op.meta.key, pid: handle.pid });
      return handle;
    }).pipe(
      Effect.withSpan('Operation.invoke', { attributes: { [SpanAttributes.OPERATION.key]: op.meta.key.toString() } }),
    );

  const invoke: OperationService['invoke'] = <I, O>(op: Definition<I, O>, ...args: any[]): Effect.Effect<O> => {
    const input = args[0] as I;
    const options = args[1] as InvokeOptions | undefined;
    return Effect.gen(function* () {
      const handle = yield* spawn(op, input, options, false);
      const output = yield* awaitFirstOutput(handle);
      yield* PubSub.publish(pubsub, { operation: op, input, output, timestamp: Date.now() });
      return output;
    }).pipe(
      Effect.tapCause((cause) =>
        Effect.sync(() => {
          if (!Cause.hasInterruptsOnly(cause)) {
            log.error('operation invocation failed', { opKey: op.meta.key, cause: Cause.pretty(cause) });
          }
        }),
      ),
      withFallbackTracer,
    );
  };

  const schedule: OperationService['schedule'] = <I, O>(op: Definition<I, O>, ...args: any[]): Effect.Effect<void> => {
    const input = args[0] as I;
    const options = args[1] as InvokeOptions | undefined;
    return Effect.gen(function* () {
      yield* Ref$.update(pendingCount, (count) => count + 1);
      const fiber = yield* spawn(op, input, options, true).pipe(
        Effect.ensuring(Ref$.update(pendingCount, (count) => count - 1)),
        Effect.tapCause((cause) =>
          Effect.sync(() => {
            if (Cause.hasInterruptsOnly(cause)) {
              log.warn('scheduled operation interrupted', { opKey: op.meta.key });
            } else {
              log.error('scheduled operation failed', { opKey: op.meta.key, cause: Cause.pretty(cause) });
            }
          }),
        ),
        Effect.ignore,
        Effect.forkDetach,
      );
      pendingFibers.add(fiber);
      fiber.addObserver(() => {
        pendingFibers.delete(fiber);
      });
    }).pipe(withFallbackTracer);
  };

  const invokePromise: OperationService['invokePromise'] = async <I, O>(
    op: Definition<I, O>,
    ...args: any[]
  ): Promise<{ data?: O; error?: Error }> => {
    try {
      const data = await EffectEx.runAndForwardErrors(invoke(op, ...args) as Effect.Effect<O, Error>);
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  return {
    invoke,
    schedule,
    invokePromise,
    invocations: pubsub,
    pendingFollowups: Ref$.get(pendingCount),
    awaitFollowups: Effect.suspend(() => Fiber.awaitAll(globalThis.Array.from(pendingFibers)).pipe(Effect.asVoid)),
    _invokeCore: (op, input, options) => invoke(op, input, options),
  };
};

// Mirrors `Process.awaitOutput`, which this module cannot import: `Process` reaches back here through
// `Trace` at load time.
const awaitFirstOutput = <O>(handle: Process.Handle<any, O, any>): Effect.Effect<O> =>
  handle.subscribeOutputs().pipe(
    Stream.runHead,
    Effect.flatMap(
      Option.match({
        onSome: Effect.succeed,
        onNone: () =>
          Option.match(handle.status.exit, {
            onSome: (exit): Effect.Effect<O> =>
              exit._tag === 'Failure' ? Effect.failCause(exit.cause) : Effect.die('Process produced no output'),
            // Outputs close on a live process only when its manager suspends it: the wait was cut short.
            onNone: () => Effect.interrupt,
          }),
      }),
    ),
  );

//
// Legacy schemas and migrations.
//

/**
 * Persistent operation schema v0.1.0 — `key` and `version` are stored as data properties.
 * @deprecated Use {@link PersistentOperation} (v0.2.0) instead; the `key` and `version` now live in the object meta.
 */
export class PersistentOperation_v0_1_0 extends Type.makeObject<PersistentOperation_v0_1_0>(
  DXN.make('org.dxos.type.function', '0.1.0'),
)(
  Schema$.Struct({
    key: Schema$.optional(Schema$.String),
    name: Schema$.NonEmptyString,
    version: Schema$.String,
    description: Schema$.optional(Schema$.String),
    updated: Schema$.optional(Schema$.String),
    source: Schema$.optional(Ref.Ref(Obj.Unknown)),
    inputSchema: Schema$.optional(JsonSchema.JsonSchema),
    outputSchema: Schema$.optional(JsonSchema.JsonSchema),
    services: Schema$.optional(Schema$.Array(Schema$.String)),
    binding: Schema$.optional(Schema$.String),
  }),
) {}

/**
 * Migration from {@link PersistentOperation_v0_1_0} (v0.1.0) to {@link PersistentOperation} (v0.2.0).
 * Moves `key` and `version` from the data section into the object meta.
 */
const _migration = Migration.define({
  from: PersistentOperation_v0_1_0,
  to: PersistentOperation,
  transform: async (from) => ({
    [Obj.Meta]: { key: from.key, version: from.version },
    name: from.name,
    description: from.description,
    updated: from.updated,
    source: from.source,
    inputSchema: from.inputSchema,
    outputSchema: from.outputSchema,
    services: from.services,
    binding: from.binding,
  }),
});

/**
 * Schema migrations exported by this module.
 * Exported as an array for extensibility — append future versions here.
 */
export const migrations = [_migration];
