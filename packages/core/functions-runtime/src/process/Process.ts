//
// Copyright 2026 DXOS.org
//

// @import-as-namspace

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

import type { ServiceNotAvailableError } from '../errors';

/**
 * A running process.
 *
 * `handleInput` is called for every input submitted to the process.
 * `tick` is called initially on freshly spawned process, and to continue suspended execution.
 * `handleInput` and `tick` can be called concurrently.
 *
 * Outcomes:
 * - Done - process has completed execution.
 * - Resume - process execution should be resumed as soon as possible. Useful for splitting long-running operations in serverless environments.
 * - Suspend - process should be suspended until the next input is submitted.
 *
 * In case of conflicting outcomes: Resume takes precedence over Suspend, and Suspend takes precedence over Done.
 *
 * Resume outcome signals to the runtime that the process should be resumed by calling the `tick` method.
 * `tick` method can run in indefinite loop, by returning a Resume outcome.
 *
 * Example execution flow:
 *
 * ```
 * spawn -> tick -> handleInput -> handleInput -> tick -> tick -> done
 * ```
 */
export interface Process<I, O> {
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
  handleInput(input: I): Effect.Effect<Outcome>;

  /**
   * Called when the process is spawned or resumed from a previosly suspended state.
   *
   * @returns A signal indicating to the runtime whether the process is finished, or should be resumed later.
   * @throws Throwing in the handler will terminate the process with an error.
   *
   * Note: This function should aim to complete in under 5 seconds to avoid exceeding limits in serverless environments.
   */
  tick(): Effect.Effect<Outcome>;
}

export interface ProcessContext<I, O> {
  readonly id: ID;

  submitOutput(output: O): void;
}

const OutcomeTypeId = '~@dxos/functions-runtime/Outcome' as const;
export type OutcomeTypeId = typeof OutcomeTypeId;

/**
 * Process is done.
 */
export type OutcomeDone = {
  readonly [OutcomeTypeId]: OutcomeTypeId;
  readonly _tag: 'done';
};

export const OutcomeDone: OutcomeDone = {
  [OutcomeTypeId]: OutcomeTypeId,
  _tag: 'done',
};

export const isOutcomeDone = (result: Outcome): result is OutcomeDone =>
  result[OutcomeTypeId] === OutcomeTypeId && result._tag === 'done';

/**
 * Process should be suspended until the next input is submitted.
 */
export type OutcomeSuspend = {
  readonly [OutcomeTypeId]: OutcomeTypeId;
  readonly _tag: 'suspend';
};

export const OutcomeSuspend: OutcomeSuspend = {
  [OutcomeTypeId]: OutcomeTypeId,
  _tag: 'suspend',
};

export const isOutcomeSuspend = (result: Outcome): result is OutcomeSuspend =>
  result[OutcomeTypeId] === OutcomeTypeId && result._tag === 'suspend';

/**
 * Process execution should be resumed as soon as possible.
 */
export type OutcomeResume = {
  readonly [OutcomeTypeId]: OutcomeTypeId;
  readonly _tag: 'resume';
};

export const OutcomeResume: OutcomeResume = {
  [OutcomeTypeId]: OutcomeTypeId,
  _tag: 'resume',
};

export const isOutcomeResume = (result: Outcome): result is OutcomeResume =>
  result[OutcomeTypeId] === OutcomeTypeId && result._tag === 'resume';

export type Outcome = OutcomeDone | OutcomeSuspend | OutcomeResume;

export const isOutcome = (result: Outcome): result is Outcome => result[OutcomeTypeId] === OutcomeTypeId;

/**
 * Merge two outcomes using precedence: resume > suspend > done.
 */
export const mergeOutcomes = (left: Outcome, right: Outcome): Outcome => {
  if (isOutcomeResume(left) || isOutcomeResume(right)) return OutcomeResume;
  if (isOutcomeSuspend(left) || isOutcomeSuspend(right)) return OutcomeSuspend;
  return OutcomeDone;
};

export const ExecutableTypeId = '~@dxos/functions-runtime/Executable' as const;
export type ExecutableTypeId = typeof ExecutableTypeId;

/**
 * Executable can be run by process manager to create a process.
 * I.e. its a process factory.
 */
export interface Executable<I, O, R = never> {
  readonly [ExecutableTypeId]: ExecutableTypeId;

  readonly services: readonly Context.Tag<any, any>[];

  /**
   * Create new process of this executable.
   */
  run(ctx: ProcessContext<I, O>): Effect.Effect<Process<I, O>, never, Scope.Scope | R>;
}

export interface MakeProcessFactoryOpts {
  readonly input: Schema.Schema.AnyNoContext;
  readonly output: Schema.Schema.AnyNoContext;
  readonly services: readonly Context.Tag<any, any>[];
}

export const makeExecutable = <const Opts extends Types.NoExcessProperties<MakeProcessFactoryOpts, Opts>>(
  opts: Opts,
  run: (
    ctx: ProcessContext<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>>,
  ) => Effect.Effect<
    Process<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>>,
    never,
    Scope.Scope | Context.Tag.Identifier<NonNullable<Opts['services']>[number]>
  >,
): Executable<
  Schema.Schema.Type<Opts['input']>,
  Schema.Schema.Type<Opts['output']>,
  Context.Tag.Identifier<NonNullable<Opts['services']>[number]>
> => {
  return {
    [ExecutableTypeId]: ExecutableTypeId,
    ...opts,
    run,
  };
};

export const makeOperationExecutable = <const Op extends Operation.Definition.Any>(
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
              return OutcomeDone as Outcome;
            }),

          tick: () => Effect.succeed(OutcomeSuspend as Outcome),
        };
      }),
  );

/**
 * Create an executable that folds inputs into an accumulator, similar to `Array.reduce` but with Effect.
 *
 * The reducer receives the current accumulator and each input, returning the new accumulator and an Outcome.
 * When the reducer returns `OutcomeDone`, `finalize` converts the accumulator to the final output.
 */
export const makeAggregationExecutable = <Acc, I, O>(opts: {
  readonly input: Schema.Schema.AnyNoContext;
  readonly output: Schema.Schema.AnyNoContext;
  readonly initial: Acc;
  readonly reducer: (accumulator: Acc, input: I) => Effect.Effect<readonly [Acc, Outcome]>;
  readonly finalize: (accumulator: Acc) => O;
}): Executable<I, O> =>
  makeExecutable(
    { input: opts.input, output: opts.output, services: [] as const },
    (ctx) =>
      Effect.sync(() => {
        let accumulator = opts.initial;

        return {
          handleInput: (input: I) =>
            Effect.gen(function* () {
              const [newAcc, outcome] = yield* opts.reducer(accumulator, input);
              accumulator = newAcc;
              if (isOutcomeDone(outcome)) {
                ctx.submitOutput(opts.finalize(accumulator));
              }
              return outcome;
            }),

          tick: () => Effect.succeed(OutcomeSuspend as Outcome),
        };
      }),
  );

export namespace Executable {
  export type Any = Executable<any, any>;
}

export enum State {
  RUNNING = 'running',
  COMPLETED = 'completed',
  TERMINATING = 'terminating', // TODO(dmaretskyi): Remove?
  TERMINATED = 'terminated',
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

export interface Manager {
  spawn<I, O>(factory: Executable<I, O>, options?: SpawnOptions): Effect.Effect<Handle<I, O>, ServiceNotAvailableError>;
  attach<I, O>(id: ID): Effect.Effect<Handle<I, O>>;
  list(): Effect.Effect<readonly Handle.Any[]>;
}

/**
 * Tag for the ProcessManager service.
 */
export class ProcessManager extends Context.Tag('@dxos/functions-runtime/ProcessManager')<
  ProcessManager,
  Manager
>() {}
