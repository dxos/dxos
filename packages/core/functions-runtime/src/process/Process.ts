//
// Copyright 2026 DXOS.org
//

// @import-as-namspace

/*
 - Termination notification.
 - Backpressure.
*/

import * as Scope from 'effect/Scope';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type * as Exit from 'effect/Exit';
import * as Context from 'effect/Context';
import type * as Types from 'effect/Types';

import { Operation, OperationHandlerSet } from '@dxos/operation';
import type { TracingService } from '@dxos/protocols/proto/dxos/tracing';
import * as Option from 'effect/Option';
import type { Atom } from '@effect-atom/atom';
import type { ObjectId } from '@dxos/protocols';
import { assertArgument } from '@dxos/invariant';
import type { A } from 'vitest/dist/chunks/reporters.d.BFLkQcL6.js';
import type { Layer } from 'effect';

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
export interface Callbacks<I, O, R> {
  /**
   * Called when the process is spawned.
   * Not called for processes that are resumed from a previously suspended state.
   *
   * @returns A signal indicating to the runtime whether the process is finished, or should be resumed later.
   * @throws Throwing in the handler will terminate the process with an error.
   *
   * Note: This function should aim to complete in under 5 seconds to avoid exceeding limits in serverless environments.
   */
  onSpawn(): Effect.Effect<void, never, R | BaseServices>;

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
  onInput(input: I): Effect.Effect<void, never, R | BaseServices>;

  /**
   * Called when the process's alarm is triggered.
   *
   * @throws Throwing in the handler will terminate the process with an error.
   */
  onAlarm(): Effect.Effect<void, never, R | BaseServices>;

  /**
   * Called when the process's child process produces output or exits.
   *
   * This allows the parent process to hibernate while a long-running child process is running.
   */
  onChildEvent(event: ChildEvent<unknown>): Effect.Effect<void, never, R | BaseServices>;
}

/**
 * Services that are always available to all processes.
 */
export type BaseServices = TracingService;

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
   * Target object that this process is assigned to.
   */
  readonly target: ObjectId | null;
}

//
// Executable.
//

export const ProcessTypeId = '~@dxos/functions-runtime/Process' as const;
export type ProcessTypeId = typeof ProcessTypeId;

/**
 * A process (factory).
 * Can be instantiated mutlitple times to produce new runtime instance with separate state and callbacks.
 * `create` is used to instantiate a new process.
 * Can store runtime state in scope of `create` function.
 */
export interface Process<I, O, R> extends Process.Variance<I, O, R> {
  /**
   * Unique identifier for the executable in the reverse DNS format.
   */
  readonly key: string;

  /**
   * Human-readable label from {@link MakeExecutableOpts.name} when provided.
   */
  readonly name?: string;

  readonly services: readonly Context.Tag<any, any>[];

  /**
   * Create a new instance of the process.
   */
  create(ctx: ProcessContext<I, O>): Effect.Effect<Callbacks<I, O, R>, never, R | BaseServices | Scope.Scope>;
}

export const isProcess = (executable: unknown): executable is Process.Any =>
  typeof executable === 'object' && executable !== null && ProcessTypeId in executable;

export namespace Process {
  export interface Variance<I, O, R> {
    readonly [ProcessTypeId]: {
      readonly _Input: Types.Contravariant<I>;
      readonly _Output: Types.Covariant<O>;
      readonly _Requirements: Types.Covariant<R>;
    };
  }

  export type Any = Process<any, any, never>;
}

export interface MakeProcessOpts {
  /**
   * Unique identifier for the process in the reverse DNS format.
   */
  readonly key: string;

  readonly input: Schema.Schema.AnyNoContext;
  readonly output: Schema.Schema.AnyNoContext;
  readonly services: readonly Context.Tag<any, any>[];
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
        Context.Tag.Identifier<NonNullable<Opts['services']>[number]>
      >
    >,
    never,
    Context.Tag.Identifier<NonNullable<Opts['services']>[number]> | BaseServices | Scope.Scope
  >,
): Process<
  Schema.Schema.Type<Opts['input']>,
  Schema.Schema.Type<Opts['output']>,
  Context.Tag.Identifier<NonNullable<Opts['services']>[number]>
> => {
  assertArgument(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(opts.key),
    'key',
    'Invalid key',
  );
  return {
    [ProcessTypeId]: {} as any,
    ...opts,
    create: (ctx) =>
      create(ctx).pipe(
        Effect.map((partial) => ({
          onSpawn: () => Effect.void,
          onInput: () => Effect.void,
          onAlarm: () => Effect.void,
          onChildEvent: () => Effect.void,
          ...partial,
        })),
      ),
  };
};

export const fromOperation = <const Op extends Operation.Definition.Any>(
  op: Op,
  handler: OperationHandlerSet.OperationHandlerSet,
): Process<Operation.Definition.Input<Op>, Operation.Definition.Output<Op>, Operation.Definition.Services<Op>> =>
  make(
    {
      key: op.meta.key,
      input: op.input,
      output: op.output,
      services: op.services,
    },
    (ctx) =>
      Effect.gen(function* () {
        const semaphore = yield* Effect.makeSemaphore(1);

        return {
          onInput: (input: Operation.Definition.Input<Op>) =>
            Effect.gen(function* () {
              const opHandler = yield* OperationHandlerSet.getHandler(handler, op).pipe(Effect.orDie);
              const output = yield* opHandler.handler(input).pipe(Effect.orDie) as Effect.Effect<
                Operation.Definition.Output<Op>,
                never,
                never
              >;

              ctx.submitOutput(output);
              ctx.succeed();
            }).pipe(semaphore.withPermits(1)),
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

export class ProcessMonitorService extends Context.Tag('@dxos/functions-runtime/ProcessMonitorService')<
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
