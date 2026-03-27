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

import * as Process from './Process';

/**
 * Creates an OperationInvoker that executes each operation by spawning a process via the ProcessManager.
 * Service resolution, storage, and lifecycle are handled by the process manager.
 *
 * When `parentProcessId` is set, spawned processes inherit the parent's trace context.
 */
export const make = (opts: {
  manager: Process.Manager;
  handlerSet: OperationHandlerSet.OperationHandlerSet;
  parentProcessId?: Process.ID;
}): Operation.OperationService => {
  const pubsub = Effect.runSync(PubSub.unbounded<OperationInvoker.InvocationEvent>());
  const pendingCount = Effect.runSync(Ref.make(0));
  const pendingFibers = new Set<Fiber.RuntimeFiber<any, any>>();

  const invokeCore = <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    tracingOptions?: Process.TracingOptions,
  ): Effect.Effect<O, Error> =>
    Effect.gen(function* () {
      const executable = Process.fromOperation(op, opts.handlerSet);

      const handle = yield* opts.manager.spawn(executable, {
        parentProcessId: opts.parentProcessId,
        tracing: tracingOptions,
      });

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
      yield* handle.submitInput(input);
      const outputs = yield* Fiber.join(outputFiber);

      const first = Chunk.head(outputs);
      if (first._tag === 'None') {
        const status = yield* handle.status();
        if (status.state === Process.State.FAILED) {
          return yield* Effect.fail(new Error(`Operation ${op.meta.key} failed`));
        }
        return yield* Effect.fail(new Error(`Operation ${op.meta.key} produced no output`));
      }

      return first.value;
    });

  const invoke: OperationInvoker.OperationInvoker['invoke'] = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Effect.Effect<O, Error> => {
    const input = args[0] as I;
    const options = args[1] as (Operation.InvokeOptions & { tracing?: Process.TracingOptions }) | undefined;
    return Effect.gen(function* () {
      const output = yield* invokeCore(op, input, options?.tracing);

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
      const fiber = yield* invokeCore(op, input).pipe(
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

  const invokeSync: OperationInvoker.OperationInvoker['invokeSync'] = <I, O>(
    _op: Operation.Definition<I, O>,
    ..._args: any[]
  ): { data?: O; error?: Error } => {
    return { error: new Error('invokeSync is not supported for process-backed operations') };
  };

  return {
    invoke,
    schedule,
    invokePromise,
    invokeSync,
  };
};

export const layer: Layer.Layer<
  Operation.Service,
  never,
  Process.ManagerService | OperationHandlerSet.Provider
> = Layer.effect(
  Operation.Service,
  Effect.gen(function* () {
    const manager = yield* Process.ManagerService;
    const handlerSet = yield* OperationHandlerSet.Provider;
    return make({ manager, handlerSet });
  }),
);
