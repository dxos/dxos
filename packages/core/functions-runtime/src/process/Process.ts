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

//
// Process.
//

/**
 * A running process.
 *
 * Process lifecycle: Initial -> Running <-> Suspended -> Terminated.
 *
 * - onSpawn -> called once when the process is spawned.
 * - onInput -> called for every input submitted to the process.
 * - onAlarm -> called for processes scheduling alarms.
 * - onChildEvent -> called when child process produces output or exits.
 */
export interface Process<I, O, R> {
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

//
// Executable.
//

export const ExecutableTypeId = '~@dxos/functions-runtime/Executable' as const;
export type ExecutableTypeId = typeof ExecutableTypeId;

/**
 * A process factory.
 */
// TODO(dmaretskyi): ProcessModule ProcessFactory?
export interface Executable<I, O, R> extends Executable.Variance<I, O, R> {
  readonly services: readonly Context.Tag<any, any>[];

  /**
   * Create new process of this executable.
   */
  // TODO(dmaretskyi): create
  run(ctx: ProcessContext<I, O>): Effect.Effect<Process<I, O, R>, never, R | BaseServices | Scope.Scope>;
}

export const isExecutable = (executable: unknown): executable is Executable.Any =>
  typeof executable === 'object' && executable !== null && ExecutableTypeId in executable;

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
  run: (
    ctx: ProcessContext<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>>,
  ) => Effect.Effect<
    Partial<
      Process<
        Schema.Schema.Type<Opts['input']>,
        Schema.Schema.Type<Opts['output']>,
        Context.Tag.Identifier<NonNullable<Opts['services']>[number]>
      >
    >,
    never,
    Context.Tag.Identifier<NonNullable<Opts['services']>[number]> | BaseServices | Scope.Scope
  >,
): Executable<
  Schema.Schema.Type<Opts['input']>,
  Schema.Schema.Type<Opts['output']>,
  Context.Tag.Identifier<NonNullable<Opts['services']>[number]>
> => {
  return {
    [ExecutableTypeId]: {} as any,
    ...opts,
    run: (ctx) =>
      run(ctx).pipe(
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
): Executable<Operation.Definition.Input<Op>, Operation.Definition.Output<Op>, Operation.Definition.Services<Op>> =>
  makeExecutable(
    {
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

export enum State {
  // Process is actively running.
  RUNNING = 'running',

  // Process is waiting for a child process to complete or an alarm to trigger.
  HYBERNATING = 'hybernating',

  // Process is waiting for input. It will only resume when input is submitted.
  IDLE = 'idle',

  // Process is terminating and will transition to TERMINATED state.
  // TODO(dmaretskyi): Consider removing.
  TERMINATING = 'terminating',

  // Process has been externally terminated.
  TERMINATED = 'terminated',

  // Process has completed successfully.
  SUCCEEDED = 'succeeded',

  // Process has failed.
  FAILED = 'failed',
}

export const ID = Schema.UUID.pipe(Schema.brand('ProcessId'));
export type ID = Schema.Schema.Type<typeof ID>;
