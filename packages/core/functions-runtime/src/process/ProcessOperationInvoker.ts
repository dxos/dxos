//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as PubSub from 'effect/PubSub';
import * as Ref from 'effect/Ref';
import * as Stream from 'effect/Stream';

import { runAndForwardErrors } from '@dxos/effect';
import { Operation, OperationHandlerSet, type OperationInvoker } from '@dxos/operation';

import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Context from 'effect/Context';

import { ProcessNotFoundError } from '../errors';
import * as Process from './Process';
import * as ProcessManager from './ProcessManager';
import { log } from '@dxos/log';

export interface OperationFiber<T> {
  pid: Process.ID;
  await: Effect.Effect<Exit.Exit<T>>;
  poll: Effect.Effect<Option.Option<Exit.Exit<T>>>;
}

export interface ProcessOperationInvoker {
  /**
   * Invoke an operation and return a fiber that can be used to await the result.
   */
  invokeFiber: <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    tracingOptions?: ProcessManager.TracingOptions,
  ) => Effect.Effect<OperationFiber<O>>;

  /**
   * Attach to a running process and return a fiber that can be used to await the result.
   */
  attachFiber: <T>(pid: Process.ID) => Effect.Effect<OperationFiber<T>, ProcessNotFoundError>;
}

export class Service extends Context.Tag('@dxos/functions/ProcessOperationInvoker')<
  Service,
  ProcessOperationInvoker
>() {}

const fiberFromProcess = <T>(handle: ProcessManager.Handle<any, T>): Effect.Effect<OperationFiber<T>> =>
  Effect.gen(function* () {
    const outputFiber = yield* handle.subscribeOutputs().pipe(
      Stream.runCollect,
      Effect.map(Chunk.head),
      Effect.flatten,
      Effect.catchTag('NoSuchElementException', () => Effect.dieMessage(`Operation produced no output`)),
      Effect.fork,
    );
    log('subscribed to outputs', { handle });
    return {
      pid: handle.pid,
      await: outputFiber.await,
      poll: outputFiber.poll,
    };
  });

/**
 * Creates an OperationInvoker that executes each operation by spawning a process via the ProcessManager.
 * Service resolution, storage, and lifecycle are handled by the process manager.
 *
 * When `parentProcessId` is set, spawned processes inherit the parent's trace context.
 */
export const make = (opts: {
  manager: ProcessManager.Manager;
  handlerSet: OperationHandlerSet.OperationHandlerSet;
  parentProcessId?: Process.ID;
}): Operation.OperationService & ProcessOperationInvoker => {
  const pubsub = Effect.runSync(PubSub.unbounded<OperationInvoker.InvocationEvent>());
  const pendingCount = Effect.runSync(Ref.make(0));
  const pendingFibers = new Set<Fiber.RuntimeFiber<any>>();

  const invokeFiber = <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    tracingOptions?: ProcessManager.TracingOptions,
  ): Effect.Effect<OperationFiber<O>> =>
    Effect.gen(function* () {
      const executable = Process.fromOperation(op, opts.handlerSet);

      const handle = yield* opts.manager.spawn(executable, {
        parentProcessId: opts.parentProcessId,
        tracing: tracingOptions,
      });
      log('spawned process', { op, input, handle });

      yield* handle.submitInput(input);
      log('submitted input', { op, input, handle });
      return yield* fiberFromProcess(handle);
    });

  const attachFiber = <T>(pid: Process.ID): Effect.Effect<OperationFiber<T>> =>
    Effect.gen(function* () {
      const handle = yield* opts.manager.attach<any, T>(pid);
      return yield* fiberFromProcess(handle);
    });

  const invoke: Operation.OperationService['invoke'] = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Effect.Effect<O> => {
    const input = args[0] as I;
    const options = args[1] as (Operation.InvokeOptions & { tracing?: ProcessManager.TracingOptions }) | undefined;
    return Effect.gen(function* () {
      const fiber = yield* invokeFiber(op, input, options?.tracing);
      const output = yield* fiber.await.pipe(Effect.flatten);

      yield* PubSub.publish(pubsub, {
        operation: op,
        input,
        output,
        timestamp: Date.now(),
      });

      return output;
    });
  };

  const schedule: OperationInvoker.OperationInvoker['schedule'] = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Effect.Effect<void> => {
    const input = args[0] as I;
    return Effect.gen(function* () {
      yield* Ref.update(pendingCount, (count) => count + 1);
      const fiber = yield* invokeFiber(op, input).pipe(
        Effect.ensuring(Ref.update(pendingCount, (count) => count - 1)),
        Effect.ignore,
        Effect.fork,
      );
      pendingFibers.add(fiber);
      fiber.addObserver(() => pendingFibers.delete(fiber));
    });
  };

  const invokePromise: OperationInvoker.OperationInvoker['invokePromise'] = async <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Promise<{ data?: O; error?: Error }> => {
    try {
      const data = await runAndForwardErrors(invoke(op, ...args) as Effect.Effect<O, Error>);
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  return {
    invoke,
    schedule,
    invokePromise,
    invokeFiber,
    attachFiber,
  };
};

export const layer: Layer.Layer<
  Operation.Service | Service,
  never,
  ProcessManager.ProcessManagerService | OperationHandlerSet.OperationHandlerProvider
> = Layer.unwrapEffect(
  Effect.gen(function* () {
    const manager = yield* ProcessManager.ProcessManagerService;
    const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
    const service = make({ manager, handlerSet });
    return Layer.mergeAll(Layer.succeed(Operation.Service, service), Layer.succeed(Service, service));
  }),
);
