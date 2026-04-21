//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as PubSub from 'effect/PubSub';
import * as Ref from 'effect/Ref';
import * as Stream from 'effect/Stream';

import { DXN } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { Process, Trace } from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation, OperationHandlerSet, type OperationInvoker } from '@dxos/operation';

import type { ProcessNotFoundError } from './errors';
import {
  type Handle,
  type Manager,
  ProcessManagerService,
  type SpawnOptions,
} from './ProcessManager';

export interface OperationFiber<T> {
  pid: Process.ID;
  await: Effect.Effect<Exit.Exit<T>>;
  poll: Effect.Effect<Option.Option<Exit.Exit<T>>>;
}

// TODO(dmaretskyi): Can we move this into the core invoker?
export interface ProcessOperationInvoker {
  /**
   * Invoke an operation and return a fiber that can be used to await the result.
   */
  invokeFiber: <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options?: Pick<SpawnOptions, 'traceMeta' | 'environment'>,
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

const fiberFromProcess = <T>(handle: Handle<any, T>): Effect.Effect<OperationFiber<T>> =>
  Effect.gen(function* () {
    // `forkDaemon` so the collector fiber's lifetime is independent of whichever
    // scope originated the `invoke`/`attach` call. Otherwise, subsequent
    // `attachFiber` lookups would see an interrupted exit once the caller's
    // scope closed.
    const outputFiber = yield* handle.subscribeOutputs().pipe(
      Stream.runCollect,
      Effect.map(Chunk.head),
      Effect.flatten,
      Effect.catchTag('NoSuchElementException', () =>
        Effect.gen(function* () {
          switch (handle.status.state) {
            case Process.State.FAILED: {
              return yield* Effect.failCause(
                handle.status.exit.pipe(
                  Option.flatMap(Exit.causeOption),
                  Option.getOrElse(() => Cause.die('Operation failed with unknown error')),
                ),
              );
            }
            case Process.State.TERMINATED:
              return yield* Effect.die('Operation was terminated');
            default:
              return yield* Effect.die('Process produced no output');
          }
        }),
      ),
      Effect.forkDaemon,
    );
    log('lifecycle: subscribed to outputs', { handle });
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
  manager: Manager;
  handlerSet: OperationHandlerSet.OperationHandlerSet;
  parentProcessId?: Process.ID;
}): Operation.OperationService & ProcessOperationInvoker => {
  const pubsub = Effect.runSync(PubSub.unbounded<OperationInvoker.InvocationEvent>());
  const pendingCount = Effect.runSync(Ref.make(0));
  const pendingFibers = new Set<Fiber.RuntimeFiber<any>>();
  const fiberCache = new Map<Process.ID, OperationFiber<any>>();

  const invokeFiber = <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options?: Pick<SpawnOptions, 'traceMeta' | 'environment'>,
  ): Effect.Effect<OperationFiber<O>> =>
    Effect.gen(function* () {
      const executable = Process.fromOperation(op, opts.handlerSet);

      log.info('spawing process', { opKey: op.meta.key, ...options });
      const handle = yield* opts.manager.spawn(executable, {
        ...options,
        parentProcessId: opts.parentProcessId,
        name: op.meta.name ? `${op.meta.name} (${op.meta.key})` : op.meta.key,
      });
      log('lifecycle: operation process spawned', { opKey: op.meta.key, handle });

      // Subscribe (via `fiberFromProcess`) and cache before submitting input
      // so that a handler producing output synchronously on the first input
      // can never race the collector.
      const fiber = yield* fiberFromProcess(handle);
      // TODO(dmaretskyi): Bound `fiberCache` lifetime without breaking attach
      // of completed processes. We keep cached fibers indefinitely today so
      // that `attachFiber` can still return the collected exit after the
      // spawn-side `await` has resolved.
      fiberCache.set(handle.pid, fiber);
      yield* handle.submitInput(input);
      log('lifecycle: operation input submitted', { opKey: op.meta.key, handle });
      return fiber;
    }).pipe(
      Effect.onInterrupt(() =>
        Effect.sync(() => {
          log('operation interrupted', { opKey: op.meta.key });
        }),
      ),
    );

  const attachFiber = <T>(pid: Process.ID): Effect.Effect<OperationFiber<T>> =>
    Effect.gen(function* () {
      log('lifecycle: attach to operation process', { pid });
      // Cache hit short-circuits the manager attach so that attaching to an
      // already-completed process still returns a fiber with the collected
      // exit — even if the manager would fail to attach (e.g. after the
      // manager dropped its handle).
      const cached = fiberCache.get(pid);
      if (cached) {
        return cached;
      }
      const handle = yield* opts.manager.attach<any, T>(pid);
      const newFiber = yield* fiberFromProcess(handle);
      fiberCache.set(pid, newFiber);
      return newFiber;
    });

  const invoke: Operation.OperationService['invoke'] = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Effect.Effect<O> => {
    const input = args[0] as I;
    const options = args[1] as Operation.InvokeOptions | undefined;
    const traceMeta = options?.tracing as Trace.Meta | undefined;
    log.info('invoking operation', { opKey: op.meta.key, ...options });
    return Effect.gen(function* () {
      const fiber = yield* invokeFiber(op, input, {
        traceMeta,
        environment: {
          ...(options?.spaceId !== undefined ? { space: options.spaceId } : {}),
          ...(options?.conversation !== undefined ? { conversation: options.conversation as DXN.String } : {}),
        },
      });
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
      log.info('scheduling operation', { opKey: op.meta.key });
      yield* Ref.update(pendingCount, (count) => count + 1);
      const fiber = yield* invokeFiber(op, input).pipe(
        Effect.ensuring(Ref.update(pendingCount, (count) => count - 1)),
        Effect.ignore,
        Effect.forkDaemon,
      );
      pendingFibers.add(fiber);
      fiber.addObserver((exit) => {
        pendingFibers.delete(fiber);

        if (Exit.isInterrupted(exit)) {
          log.warn('scheduled operation interrupted', { opKey: op.meta.key });
        } else if (Exit.isFailure(exit)) {
          log.error('operation schedule failed', { opKey: op.meta.key, cause: Cause.pretty(exit.cause) });
        }
      });
    }).pipe(
      Effect.onInterrupt(() =>
        Effect.sync(() => {
          log.info('operation schedule interrupted', { opKey: op.meta.key });
        }),
      ),
    );
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
  ProcessManagerService | OperationHandlerSet.OperationHandlerProvider
> = Layer.unwrapEffect(
  Effect.gen(function* () {
    const manager = yield* ProcessManagerService;
    const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
    const service = make({ manager, handlerSet });
    return Layer.mergeAll(Layer.succeed(Operation.Service, service), Layer.succeed(Service, service));
  }),
);
