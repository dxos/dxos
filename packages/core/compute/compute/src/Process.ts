//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { Atom } from '@effect-atom/atom';
import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import type * as Types from 'effect/Types';

import { Annotation } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';
import { DXN, URI } from '@dxos/keys';
import { log } from '@dxos/log';

import * as Operation from './Operation';
import * as OperationHandlerSet from './OperationHandlerSet';
import * as StorageService from './StorageService';
import * as Trace from './Trace';

//
// Process.
//

/** Opaque process id (arbitrary string). */
export const ID = Schema.String.pipe(Schema.brand('ProcessId'));
export type ID = Schema.Schema.Type<typeof ID>;

/**
 * A running process callbacks.
 *
 * Process lifecycle: Initial -> Running <-> Suspended -> Terminated.
 *
 * - onSpawn -> called once when the process is spawned.
 * - onInput -> called for every input submitted to the process.
 * - onAlarm -> called for processes scheduling alarms.
 * - onChildEvent -> called when child process produces output or exits.
 */
export interface Callbacks<_Input, _Output, _Requirements, _Rpcs extends Rpc.Any> {
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
 * in {@link MakeProcessOpts.services}.
 */
export type BaseServices = Trace.TraceService | StorageService.StorageService;

export type ChildEvent<T> =
  | {
      readonly _tag: 'output';
      readonly pid: ID;
      readonly data: T;
    }
  | {
      readonly _tag: 'exited';
      readonly pid: ID;
      readonly result: Exit.Exit<void>;
    };

export interface ProcessContext<I, O> {
  readonly id: ID;

  /**
   * Parameters assigned during process creation.
   */
  readonly params: Params;

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
   * Set an alarm for the process to be woken up later.
   *
   * @param timeout - Optional timeout in milliseconds. If not provided, the process is woken up as soon as possible.
   */
  setAlarm(timeout?: number): void;
}

/**
 * Generic parameters for a all processes.
 */
export interface Params {
  /**
   * Process name for debugging purposes.
   */
  readonly name: string | null;

  /**
   * User-defined annotations for the process.
   * Can only be set when the process is spawned.
   */
  readonly annotations: Annotation.Dictionary;
}

/**
 * Attaches the process to a target object.
 */
export const TargetAnnotation = Annotation.make({
  id: 'org.dxos.process.target',
  schema: URI.Schema,
});

/**
 * Notification descriptor for surfacing process lifecycle events to the user.
 */
export const NotifyAnnotation = Annotation.make({
  id: 'org.dxos.process.notify',
  schema: Operation.NotifyOptions,
});

/**
 * Marks a process as the harness host for its conversation (discovery substrate).
 */
export const HarnessHostAnnotation = Annotation.make({
  id: 'org.dxos.process.harnessHost',
  schema: Schema.Boolean,
});

//
// Executable.
//

export const ProcessTypeId = '~@dxos/functions/Process' as const;
export type ProcessTypeId = typeof ProcessTypeId;

/**
 * A process (factory).
 * Can be instantiated mutlitple times to produce new runtime instance with separate state and callbacks.
 * `create` is used to instantiate a new process.
 * Can store runtime state in scope of `create` function.
 */
export interface Process<
  _Input,
  _Output,
  _Requirements = never,
  _Rpcs extends Rpc.Any = never,
> extends Process.Variance<_Input, _Output, _Requirements, _Rpcs> {
  /**
   * Unique identifier for the executable in the reverse DNS format.
   */
  readonly key: string;

  /**
   * Human-readable label from {@link MakeExecutableOpts.name} when provided.
   */
  readonly name?: string;

  readonly services: readonly Context.Tag<any, any>[];

  // Runtime RPC group, stored as `any`. `RpcGroup`/`RpcClient` are invariant in their type
  // argument (and `Callbacks.rpcHandlers` is contravariant in it), so referencing `_Rpcs` in the
  // structural fields would block `Process<…, never>` from being assignable to `Process.Any`.
  // The precise group is carried by the covariant `Variance` phantom and recovered at `spawn`.
  // See design spec §4.4.
  readonly rpcs: RpcGroup.RpcGroup<any>;

  /**
   * Create a new instance of the process.
   */
  create(
    ctx: ProcessContext<_Input, _Output>,
  ): Effect.Effect<Callbacks<_Input, _Output, _Requirements, any>, never, _Requirements | BaseServices | Scope.Scope>;
}

export const isProcess = (executable: unknown): executable is Process.Any =>
  typeof executable === 'object' && executable !== null && ProcessTypeId in executable;

export namespace Process {
  export interface Variance<_Input, _Output, _Requirements, _Rpcs> {
    readonly [ProcessTypeId]: {
      readonly _Input: Types.Contravariant<_Input>;
      readonly _Output: Types.Covariant<_Output>;
      readonly _Requirements: Types.Covariant<_Requirements>;

      // Phantom-covariant: lets `never`-RPC processes stay assignable to `Process.Any` while
      // `spawn` still recovers the precise group from this slot. See design spec §4.4.
      readonly _Rpcs: Types.Covariant<_Rpcs>;
    };
  }

  export type Any = Process<any, any, any, any>;
}

export interface MakeProcessOpts {
  /**
   * Unique identifier for the process in the reverse DNS format.
   */
  readonly key: string;

  readonly input: Schema.Schema.AnyNoContext;
  readonly output: Schema.Schema.AnyNoContext;
  readonly services: readonly Context.Tag<any, any>[];
  readonly rpcs?: RpcGroup.RpcGroup<any>;
}

export const make = <const Opts extends Types.NoExcessProperties<MakeProcessOpts, Opts>>(
  opts: Opts,
  create: (
    ctx: ProcessContext<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>>,
  ) => Effect.Effect<
    Partial<
      Callbacks<
        Schema.Schema.Type<Opts['input']>,
        Schema.Schema.Type<Opts['output']>,
        Context.Tag.Identifier<NonNullable<Opts['services']>[number]>,
        RpcGroup.Rpcs<Opts['rpcs']>
      >
    >,
    never,
    Context.Tag.Identifier<NonNullable<Opts['services']>[number]> | BaseServices | Scope.Scope
  >,
): Process<
  Schema.Schema.Type<Opts['input']>,
  Schema.Schema.Type<Opts['output']>,
  Context.Tag.Identifier<NonNullable<Opts['services']>[number]>,
  RpcGroup.Rpcs<Opts['rpcs']>
> => {
  assertArgument(/^[a-z0-9]([a-z0-9.\-/]*[a-z0-9])?$/i.test(opts.key), 'key', 'Invalid key');
  return {
    [ProcessTypeId]: {} as any,
    ...opts,
    rpcs: opts.rpcs ?? RpcGroup.make(),
    create: (ctx) =>
      create(ctx).pipe(
        Effect.map((partial) => ({
          onSpawn: () => Effect.void,
          onInput: () => Effect.void,
          onAlarm: () => Effect.void,
          onChildEvent: () => Effect.void,
          ...partial,
          rpcHandlers: sanitizeRpcs(opts.rpcs, partial.rpcHandlers),
        })),
      ),
  };
};

// Returns `Context.Context<any>`: the runtime handler bag is stored untyped because
// `Callbacks.rpcHandlers` is contravariant in `_Rpcs` (see design spec §4.4); the precise
// handler contract is enforced by `make`'s `create` parameter, not by this internal helper.
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
    throw new TypeError('Process declared RPCs but did not provide any handlers');
  }
  return provided;
};

/**
 * Durable marker recording that an operation's input handler has begun executing.
 * Persisted before the handler runs so that, after an interruption (suspend/restart), a
 * re-delivered input can tell that the previous attempt was in-flight. Cleared automatically
 * when the process reaches a terminal state (the runtime clears the process's storage).
 */
const OperationStartedCell = StorageService.cell(Schema.parseJson(Schema.Boolean), 'operation/started').pipe(
  StorageService.withDefault(() => false),
);

export const fromOperation = <const Op extends Operation.Definition.Any>(
  op: Op,
  handler: OperationHandlerSet.OperationHandlerSet,
): Process<Operation.Definition.Input<Op>, Operation.Definition.Output<Op>, Operation.Definition.Services<Op>> =>
  make(
    {
      key: DXN.getName(op.meta.key),
      input: op.input,
      output: op.output,
      services: op.services,
    },
    (ctx) =>
      Effect.gen(function* () {
        const semaphore = yield* Effect.makeSemaphore(1);
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

              const opHandler = yield* OperationHandlerSet.getHandler(handler, op).pipe(Effect.orDie);
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
              Effect.catchAllDefect((defect) =>
                Effect.gen(function* () {
                  // Emit operation end event with failure.
                  const errorMessage = defect instanceof Error ? defect.message : String(defect);
                  yield* Trace.write(Trace.OperationEnd, {
                    key: op.meta.key,
                    name: op.meta.name,
                    icon: op.meta.icon,
                    outcome: 'failure',
                    error: errorMessage,
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
 * Runtime state of a process.
 */
export enum State {
  // Process is actively running.
  RUNNING = 'RUNNING',

  // Process is waiting for a child process to complete or an alarm to trigger.
  HYBERNATING = 'HYBERNATING',

  // Process is waiting for input. It will only resume when input is submitted.
  IDLE = 'IDLE',

  // Process is terminating and will transition to TERMINATED state.
  // TODO(dmaretskyi): Consider removing.
  TERMINATING = 'TERMINATING',

  // Process has been externally terminated.
  TERMINATED = 'TERMINATED',

  // Process has completed successfully.
  SUCCEEDED = 'SUCCEEDED',

  // Process has failed.
  FAILED = 'FAILED',
}

/**
 * Read-only view of a process tree
 */
export interface Monitor {
  /**
   * Get the current state of the process tree.
   */
  processTree: Effect.Effect<readonly Info[]>;

  /**
   * Atom for the process tree.
   */
  processTreeAtom: Atom.Atom<readonly Info[]>;
}

export class ProcessMonitorService extends Context.Tag('@dxos/functions/ProcessMonitorService')<
  ProcessMonitorService,
  Monitor
>() {}

export interface Info {
  readonly pid: ID;
  readonly parentPid: ID | null;

  /**
   * Key of the process.
   *
   * NOTE: There might be multiple running processes with the same key.
   */
  readonly key: string;

  /**
   * Parameters of the process.
   */
  readonly params: Params;

  /**
   * State of the process.
   */
  readonly state: State;

  /**
   * Error of the process.
   * Only for process in FAILED state.
   */
  readonly error: string | null;

  /**
   * UNIX timestamp in milliseconds.
   */
  readonly startedAt: number;

  /**
   * UNIX timestamp in milliseconds.
   */
  readonly completedAt: Option.Option<number>;

  readonly metrics: {
    /**
     * Total wall time of all handler invocations of the process in milliseconds.
     */
    readonly wallTime: number;

    /**
     * Total number of inputs submitted to the process.
     */
    readonly inputCount: number;

    /**
     * Total number of outputs submitted to the process.
     */
    readonly outputCount: number;
  };
}

/**
 * New process is spawned.
 */
export const SpawnedEvent = Trace.EventType('process.spawned', {
  schema: Schema.Void,
  isEphemeral: false,
});

/**
 * Process has reached a terminal state.
 */
export const ExitedEvent = Trace.EventType('process.exited', {
  schema: Schema.Struct({
    outcome: Schema.Literal('succeeded', 'failed', 'terminated'),
  }),
  isEphemeral: false,
});

/**
 * Renders spawned processes as a forest: top-level rows use "- ", nested rows use ├── / └── / │.
 */
export const prettyProcessTree = (tree: readonly Info[]): string => {
  if (tree.length === 0) {
    return '';
  }

  const pidSet = new Set(tree.map((node) => node.pid));
  const childrenByParent = new Map<string, Info[]>();
  const roots: Info[] = [];

  for (const node of tree) {
    const parent = node.parentPid;
    if (parent === null || !pidSet.has(parent)) {
      roots.push(node);
      continue;
    }
    const key = String(parent);
    const siblings = childrenByParent.get(key) ?? [];
    siblings.push(node);
    childrenByParent.set(key, siblings);
  }

  const byPid = (a: Info, b: Info) => String(a.pid).localeCompare(String(b.pid));
  roots.sort(byPid);
  for (const siblings of childrenByParent.values()) {
    siblings.sort(byPid);
  }

  const formatLabel = (node: Info): string => {
    const idShort = String(node.pid).slice(0, 6);
    const parts = [idShort, node.state];
    if (node.params.name != null && node.params.name !== '') {
      parts.push(node.params.name);
    }
    if (node.error != null) {
      parts.push(`(${node.error})`);
    }
    const { inputCount, outputCount, wallTime } = node.metrics;
    parts.push(`[in:${inputCount} out:${outputCount} wall:${Math.round(wallTime)}ms]`);
    return parts.join(' ');
  };

  const lines: string[] = [];

  const walk = (node: Info, prefix: string, isLast: boolean, isRoot: boolean): void => {
    if (isRoot) {
      lines.push(`- ${formatLabel(node)}`);
    } else {
      const branch = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${branch}${formatLabel(node)}`);
    }

    const children = childrenByParent.get(String(node.pid)) ?? [];
    const nextPrefix = isRoot ? '  ' : `${prefix}${isLast ? '    ' : '│   '}`;
    children.forEach((child, index) => {
      walk(child, nextPrefix, index === children.length - 1, false);
    });
  };

  for (const root of roots) {
    walk(root, '', true, true);
  }

  return lines.join('\n');
};
