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
import * as Stream from 'effect/Stream';
import type { Atom } from '@effect-atom/atom';
import * as Schema from 'effect/Schema';
import type * as Option from 'effect/Option';
import type * as Exit from 'effect/Exit';
import * as Context from 'effect/Context';
import type * as Types from 'effect/Types';

import type { ObjectId } from '@dxos/keys';
import { Operation, OperationHandlerSet } from '@dxos/operation';


//
// Process.
//

/**
 * A running process.
 * 
 * Process lifecycle: Initial -> Running <-> Suspended -> Terminated.
 * 
 * - init -> called once when the process is spawned.
 * - handleInput -> called for every input submitted to the process.
 * - alarm -> called for processes scheduling alarms.
 * - childEvent -> called when child process produces output or exits.
 */
export interface Process<I, O> {

  /**
   * Called when the process is spawned.
   * Not called for processes that are resumed from a previously suspended state.
   *
   * @returns A signal indicating to the runtime whether the process is finished, or should be resumed later.
   * @throws Throwing in the handler will terminate the process with an error.
   *
   * Note: This function should aim to complete in under 5 seconds to avoid exceeding limits in serverless environments.
   */
  init(): Effect.Effect<void>;

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
  handleInput(input: I): Effect.Effect<void>;

  /**
   * Called when the process's alarm is triggered.
   *
   * @throws Throwing in the handler will terminate the process with an error.
   */
  alarm(): Effect.Effect<void>;

  /**
   * Called when the process's child process produces output or exits.
   * 
   * This allows the parent process to hibernate while a long-running child process is running.
   */
  childEvent(event: ChildEvent<unknown>): Effect.Effect<void>;
}

export type ChildEvent<T> = {
  readonly _tag: 'output';
  readonly data: T;
} | {
  readonly _tag: 'exited';
  readonly result: Exit.Exit<void>;
}

export interface ProcessContext<I, O> {
  readonly id: ID;

  /**
   * Complete this process with sucessful result.
   * No additional events will be pushed to the process.
   */
  exit(): void;

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


//
// Executable.
//

export const ExecutableTypeId = '~@dxos/functions-runtime/Executable' as const;
export type ExecutableTypeId = typeof ExecutableTypeId;


export interface Executable<I, O, R> extends Executable.Variance<I, O, R> {
  readonly services: readonly Context.Tag<any, any>[];

  /**
   * Create new process of this executable.
   */
  run(ctx: ProcessContext<I, O>): Effect.Effect<Process<I, O>, never, Scope.Scope | R>;
}

export const isExecutable = (executable: unknown): executable is Executable.Any => typeof executable === 'object' && executable !== null && ExecutableTypeId in executable;

export namespace Executable {
  export interface Variance<I, O, R> {
    readonly [ExecutableTypeId]: {
      readonly _Input: Types.Contravariant<I>;
      readonly _Output: Types.Covariant<O>;
      readonly _Requirements: Types.Covariant<R>;
    };
  }

  export type Any = Executable<any, any, never>;
}

export interface MakeExecutableOpts {
  readonly input: Schema.Schema.AnyNoContext;
  readonly output: Schema.Schema.AnyNoContext;
  readonly services: readonly Context.Tag<any, any>[];
}

export const makeExecutable = <const Opts extends Types.NoExcessProperties<MakeExecutableOpts, Opts>>(
  opts: Opts,
  run: (ctx: ProcessContext<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>>) => Effect.Effect<Process<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>>, never, Scope.Scope | Context.Tag.Identifier<NonNullable<Opts['services']>[number]>>,
): Executable<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>, Context.Tag.Identifier<NonNullable<Opts['services']>[number]>> => {
  return {
    [ExecutableTypeId]: {} as any,
    ...opts,
    run,
  };
};

export const fromOperation = <const Op extends Operation.Definition.Any>(
  op: Op,
  handler: OperationHandlerSet.OperationHandlerSet,
): Executable<Operation.Definition.Input<Op>, Operation.Definition.Output<Op>, Operation.Definition.Services<Op>> =>
  makeExecutable(
    {
      input: op.input,
      output: op.output,
      services: op.services,
    },
    (ctx) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Operation.Definition.Services<Op>>();

        return {
          init: () => Effect.void,
          handleInput: (input: Operation.Definition.Input<Op>) =>
            Effect.gen(function* () {
              const opHandler = yield* OperationHandlerSet.getHandler(handler, op).pipe(Effect.orDie);
              const output = yield* opHandler
                .handler(input)
                .pipe(Effect.orDie, Effect.provide(runtime)) as Effect.Effect<
                  Operation.Definition.Output<Op>,
                  never,
                  never
                >;

              ctx.submitOutput(output);
              ctx.exit();
            }),

          alarm: () => Effect.void,
          childEvent: (event: ChildEvent<unknown>) => Effect.void,
        };
      }),
  );


export enum State {
  RUNNING = 'running',
  COMPLETED = 'completed',
  TERMINATING = 'terminating', // TODO(dmaretskyi): Remove?
  TERMINATED = 'terminated',
  HYBERNATING = 'hybernating',
  FAILED = 'failed',
}

export interface Status {
  readonly state: State;
  readonly exit: Option.Option<Exit.Exit<void>>;

  readonly startedAt: Date;
  readonly completedAt: Option.Option<Date>;
}

export const ID = Schema.UUID.pipe(Schema.brand('ProcessId'));
export type ID = Schema.Schema.Type<typeof ID>;

export interface Handle<I, O> {
  readonly id: ID;
  readonly parentId: Option.Option<ID>;

  submitInput(input: I): Effect.Effect<void>;
  subscribeOutputs(): Stream.Stream<O>;

  terminate(): Effect.Effect<void>;
  status(): Effect.Effect<Status>;
  statusAtom: Atom.Atom<Status>;
}

export namespace Handle {
  export type Any = Handle<any, any>;
}

/**
 * Tracing metadata attached to a process spawn.
 */
export interface TracingOptions {
  /** Parent message ObjectId for trace context. */
  readonly message?: ObjectId;
  /** Tool call ID for trace context. */
  readonly toolCallId?: string;
}

/**
 * Options for spawning a process.
 */
export interface SpawnOptions {
  /** Parent process ID — child inherits the parent's trace context. */
  readonly parentProcessId?: ID;
  /** Tracing metadata for this invocation. */
  readonly tracing?: TracingOptions;
}

/**
 * API for managing processes.
 */
export interface Manager {
  /**
   * Spawn a new process for an executable.
   */
  spawn<I, O>(executable: Executable<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>>;
  /**
   * Attach to an existing process.
   */
  attach<I, O>(id: ID): Effect.Effect<Handle<I, O>>;

  /**
   * Attach to an existing process if it exists, otherwise spawn a new process for the executable.
   * `executable` and `options` are ignored if the process already exists.
   */
  ensure<I, O>(id: ID, executable: Executable<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>>;

  /**
   * List all spawned processes.
   */
  list(): Effect.Effect<readonly Handle.Any[]>;
}

/**
 * Tag for the ProcessManager service.
 */
export class ManagerService extends Context.Tag('@dxos/functions-runtime/ManagerService')<
  ManagerService,
  Manager
>() {
}
