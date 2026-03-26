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

import { Ref, type Obj } from '@dxos/echo';
import type { ObjectId } from '@dxos/keys';
import { Operation, OperationHandlerSet } from '@dxos/operation';


//
// Process.
//

/**
 * A running process.
 *
 * `init` is called when the process is spawned.
 * `handleInput` is called for every input submitted to the process.
 * `tick` is called to continue suspended execution.
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
 * spawn -> init -> handleInput -> handleInput -> tick -> tick -> done
 * ```
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
  init(): Effect.Effect<Outcome>;

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
   * Called when the process is resumed from a previously suspended state.
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


//
// Executable.
//

export const ExecutableTypeId = '~@dxos/functions-runtime/Executable' as const;
export type ExecutableTypeId = typeof ExecutableTypeId;


export interface Executable<I, O> extends Executable.Variance<I, O> {
  readonly spec: ExecutableSpec;
}

export const isExecutable = (executable: unknown): executable is Executable.Any => typeof executable === 'object' && executable !== null && ExecutableTypeId in executable;

export namespace Executable {
  export interface Variance<I, O> {
    readonly [ExecutableTypeId]: {
      readonly _Input: Types.Contravariant<I>;
      readonly _Output: Types.Covariant<O>;
    };
  }

  export type Any = Executable<any, any>;
}

export type ExecutableSpec = {
  readonly kind: 'operation';

  readonly operation: Operation.Definition.Any;
} | {
  readonly kind: 'prompt';
  readonly prompt: Ref.Ref<Obj.Unknown>;
} | {
  readonly kind: 'agent';
  readonly chat: Ref.Ref<Obj.Unknown>;
};
/**
 * Executes an operation.
 * Takes one input and produces one output.
 */
export const makeOperationExecutable = <const Op extends Operation.Definition.Any>(
  op: Op,
): Executable<Operation.Definition.Input<Op>, Operation.Definition.Output<Op>> => ({
  [ExecutableTypeId]: {} as any,
  spec: {
    kind: 'operation',
    operation: op,
  },
});

/**
 * Executes a prompt.
 * Takes one input and produces one output.
 * Input type is based on the prompt's input schema.
 * Output type is based on the prompt's output schema.
 */
export const makePromptExecutable = (prompt: Ref.Ref<Obj.Unknown>): Executable<any, any> => ({
  [ExecutableTypeId]: {} as any,
  spec: {
    kind: 'prompt',
    prompt,
  },
});

/**
 * Agent takes in many inputs in the form of user instructions or events and produces no output.
 * Agebt writes its output to the chat.
 */
export const makeAgentExecutable = (chat: Ref.Ref<Obj.Unknown>): Executable<any, unknown> => ({
  [ExecutableTypeId]: {} as any,
  spec: {
    kind: 'agent',
    chat,
  },
});


export const ModuleTypeId = '~@dxos/functions-runtime/Module' as const;
export type ModuleTypeId = typeof ModuleTypeId;

/**
 * Module can be run by process manager to create a process.
 * I.e. its a process factory.
 */
export interface Module<I, O, R = never> {
  readonly [ModuleTypeId]: ModuleTypeId;

  readonly services: readonly Context.Tag<any, any>[];

  /**
   * Create new process of this executable.
   */
  run(ctx: ProcessContext<I, O>): Effect.Effect<Process<I, O>, never, Scope.Scope | R>;
}

//
// Module.
//

export namespace Module {
  export type Any = Module<any, any>;
}

export interface MakeModuleOpts {
  readonly input: Schema.Schema.AnyNoContext;
  readonly output: Schema.Schema.AnyNoContext;
  readonly services: readonly Context.Tag<any, any>[];
}

export const makeModule = <const Opts extends Types.NoExcessProperties<MakeModuleOpts, Opts>>(
  opts: Opts,
  run: (ctx: ProcessContext<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>>) => Effect.Effect<Process<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>>, never, Scope.Scope | Context.Tag.Identifier<NonNullable<Opts['services']>[number]>>,
): Module<Schema.Schema.Type<Opts['input']>, Schema.Schema.Type<Opts['output']>, Context.Tag.Identifier<NonNullable<Opts['services']>[number]>> => {
  return {
    [ModuleTypeId]: ModuleTypeId,
    ...opts,
    run,
  };
};

export const makeOperationModule = <const Op extends Operation.Definition.Any>(
  op: Op,
  handler: OperationHandlerSet.OperationHandlerSet,
): Module<Operation.Definition.Input<Op>, Operation.Definition.Output<Op>, Operation.Definition.Services<Op>> =>
  makeModule(
    {
      input: op.input,
      output: op.output,
      services: op.services,
    },
    (ctx) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Operation.Definition.Services<Op>>();

        return {
          init: () => Effect.succeed(OutcomeSuspend),
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
              return OutcomeDone;
            }),

          tick: () => Effect.succeed(OutcomeSuspend),
        };
      }),
  );


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

/**
 * API for managing processes.
 */
export interface Manager {
  /**
   * Spawn a new process for an executable.
   */
  spawn<I, O>(executable: Executable<I, O>, options?: SpawnOptions): Effect.Effect<Handle<I, O>>;
  /**
   * Attach to an existing process.
   */
  attach<I, O>(id: ID): Effect.Effect<Handle<I, O>>;

  /**
   * Attach to an existing process if it exists, otherwise spawn a new process for the executable.
   * `executable` and `options` are ignored if the process already exists.
   */
  ensure<I, O>(id: ID, executable: Executable<I, O>, options?: SpawnOptions): Effect.Effect<Handle<I, O>>;

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
