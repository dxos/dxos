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
import type * as Context from 'effect/Context';
import type { NoExcessProperties } from 'effect/Types';
import * as Deferred from 'effect/Deferred';
import { Operation, OperationHandlerSet } from '@dxos/operation';
/**
 * Running process.
 */
export interface Process<I, O> {
  handleInput(input: I): Effect.Effect<void>;

  readonly outputs: Stream.Stream<O>;
}

export interface ProcessContext {
  readonly id: ID;
}

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
  run(ctx: ProcessContext): Effect.Effect<Process<I, O>, never, Scope.Scope | R>;
}

export interface MakeProcessFactoryOpts {
  readonly input: Schema.Schema.AnyNoContext;
  readonly output: Schema.Schema.AnyNoContext;
  readonly services: readonly Context.Tag<any, any>[];
}

export const makeExecutable = <const Opts extends NoExcessProperties<MakeProcessFactoryOpts, Opts>>(
  opts: Opts,
  run: (
    ctx: ProcessContext,
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
        const latch = yield* Deferred.make<Operation.Definition.Input<Op>>();

        const runtime = yield* Effect.runtime<Operation.Definition.Services<Op>>();

        const outputs = Stream.fromEffect<Operation.Definition.Output<Op>, never, never>(
          Effect.gen(function* () {
            const opHandler = yield* OperationHandlerSet.getHandler(handler, op).pipe(Effect.orDie);

            const input = yield* latch;

            const output = yield* opHandler.handler(input).pipe(Effect.orDie, Effect.provide(runtime)) as Effect.Effect<
              Operation.Definition.Output<Op>,
              never,
              never
            >;

            return output;
          }),
        );

        return {
          handleInput: Deferred.complete(latch),
          outputs,
        };
      }),
  );

export namespace Executable {
  export type Any = Executable<any, any>;
}

///////

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

export interface Manager {
  spawn<I, O>(factory: Executable<I, O>): Effect.Effect<Handle<I, O>>;
  attach<I, O>(id: ID): Effect.Effect<Handle<I, O>>;
  list(): Effect.Effect<readonly Handle.Any[]>;
}
