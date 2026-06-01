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

import { Process, Trace } from '@dxos/compute';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { runAndForwardErrors } from '@dxos/effect';
import { EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type OperationInvoker } from '@dxos/operation';

import type { ProcessNotFoundError } from './errors';
import { ProcessManagerService } from './process-manager-service';
import type * as ProcessManager from './ProcessManager';

export interface OperationFiber<T> {
  pid: Process.ID;
  await: Effect.Effect<Exit.Exit<T>>;
  poll: Effect.Effect<Option.Option<Exit.Exit<T>>>;
}

/**
 * Maps an Effect Cause to a serializable error shape for invocation failure events.
 */
const causeToError = (cause: Cause.Cause<unknown>): { message: string; name?: string; stack?: string } => {
  const squashed = Cause.squash(cause);
  if (squashed instanceof Error) {
    return { message: squashed.message, name: squashed.name, stack: squashed.stack };
  }
  return { message: Cause.pretty(cause) };
};

// TODO(dmaretskyi): Can we move this into the core invoker?
export interface ProcessOperationInvoker {
  /**
   * Invoke an operation and return a fiber that can be used to await the result.
   */
  invokeFiber: <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options?: Pick<ProcessManager.SpawnOptions, 'traceMeta' | 'environment'>,
  ) => Effect.Effect<OperationFiber<O>>;

  /**
   * Attach to a running process and return a fiber that can be used to await the result.
   */
  attachFiber: <T>(pid: Process.ID) => Effect.Effect<OperationFiber<T>, ProcessNotFoundError>;
}

export class Service extends Context.Tag('@dxos/functions/ProcessOperationInvoker')<
  Service,
  Operation.OperationService & OperationInvoker.OperationInvokerInternal & ProcessOperationInvoker
>() {}

const fiberFromProcess = <T>(handle: ProcessManager.Handle<any, T>): Effect.Effect<OperationFiber<T>> =>
  Effect.gen(function* () {
    // `forkDaemon` so the collector fiber's lifetime is independent of whichever
    // scope originated the `invoke`/`attach` call. Otherwise, subsequent
    // `attachFiber` lookups would see an interrupted exit once the caller's
    // scope closed.
    const outputFiber = yield* handle.subscribeOutputs().pipe(
      Stream.runCollect,
      Effect.map(Chunk.head),
      Effect.flatMap(
        Option.match({
          onSome: Effect.succeed,
          onNone: () =>
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
  manager: ProcessManager.Manager;
  handlerSet: OperationHandlerSet.OperationHandlerSet;
  parentProcessId?: Process.ID;
}): Operation.OperationService & OperationInvoker.OperationInvokerInternal & ProcessOperationInvoker => {
  const pubsub = Effect.runSync(PubSub.unbounded<OperationInvoker.InvocationEvent>());
  const pendingCount = Effect.runSync(Ref.make(0));
  const pendingFibers = new Set<Fiber.RuntimeFiber<any>>();
  const fiberCache = new Map<Process.ID, OperationFiber<any>>();
  // Late-bound by the layer that owns the undo registry.
  let undoResolver: OperationInvoker.UndoResolver | undefined;
  const setUndoResolver = (resolver: OperationInvoker.UndoResolver): void => {
    undoResolver = resolver;
  };

  const invokeFiber = <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options?: Pick<ProcessManager.SpawnOptions, 'traceMeta' | 'environment' | 'notify'> & {
      /**
       * If true, do NOT link the spawned process to the current process as a
       * child. Used by {@link schedule} so that fire-and-forget operations
       * don't show up in the parent's child set and don't deliver
       * `requestChildEvent` notifications to a parent that isn't awaiting
       * them. `invoke` keeps the default (linked) behaviour so the parent's
       * `onChildEvent` can observe results.
       */
      readonly detached?: boolean;
    },
  ): Effect.Effect<OperationFiber<O>> =>
    Effect.gen(function* () {
      const executable = Process.fromOperation(op, opts.handlerSet);

      log('spawing process', { opKey: op.meta.key, ...options });
      const handle = yield* opts.manager.spawn(executable, {
        ...options,
        parentProcessId: options?.detached ? undefined : opts.parentProcessId,
        name: op.meta.name ? `${op.meta.name} (${op.meta.key})` : op.meta.key,
      });
      log('lifecycle: operation process spawned', { opKey: op.meta.key, handle });

      // Subscribe (via `fiberFromProcess`) and cache before submitting input
      // so that a handler producing output synchronously on the first input
      // can never race the collector.
      const fiber = yield* fiberFromProcess(handle);
      // TODO(dmaretskyi): Bound `fiberCache` lifetime without breaking attach
      // of completed processes (covered by the `attaches to a completed
      // process` test and relied upon by `agent-process`'s `onChildEvent`).
      // A naive delete-on-collector-completion observer prunes the entry
      // before late attachers can read it, and `ProcessHandle.subscribeOutputs`
      // does not replay a drained queue. Future fix needs either a replayable
      // exit cache on the handle or coordinated eviction (e.g. ref-count or
      // TTL).
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
    log('invoking operation', { opKey: op.meta.key, ...options });
    return Effect.gen(function* () {
      const invocationId = EntityId.random();
      const base = { invocationId, operation: op, input };

      // Publish lifecycle start event.
      yield* PubSub.publish(pubsub, { ...base, timestamp: Date.now(), status: { type: 'pending' as const } });

      const fiber = yield* invokeFiber(op, input, {
        traceMeta,
        // Notifications ride the process monitor: forward `notify` onto the spawned process's params.
        notify: options?.notify,
        environment: {
          ...(options?.spaceId !== undefined ? { space: options.spaceId } : {}),
          ...(options?.conversation !== undefined ? { conversation: options.conversation } : {}),
        },
      });
      // `fiber.await` is `Effect<Exit<O>>`; inspect the Exit to publish the terminal lifecycle event,
      // then re-raise it (Exit is a subtype of Effect) to preserve the original cause.
      const exit = yield* fiber.await;
      if (Exit.isSuccess(exit)) {
        const output = exit.value;
        const undo = undoResolver?.(op, input, output);
        yield* PubSub.publish(pubsub, {
          ...base,
          timestamp: Date.now(),
          status: { type: 'success', output, undo },
        });
      } else {
        yield* PubSub.publish(pubsub, {
          ...base,
          timestamp: Date.now(),
          status: { type: 'failure', error: causeToError(exit.cause) },
        });
      }

      return yield* exit;
    }).pipe(
      Effect.tapErrorCause((cause) =>
        Effect.sync(() => {
          if (Cause.isInterruptedOnly(cause)) {
            return;
          }
          log.error('operation invocation failed', { opKey: op.meta.key, cause: Cause.pretty(cause) });
        }),
      ),
    );
  };

  const schedule: OperationInvoker.OperationInvoker['schedule'] = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Effect.Effect<void> => {
    const input = args[0] as I;
    const options = args[1] as Operation.InvokeOptions | undefined;
    const traceMeta = options?.tracing as Trace.Meta | undefined;
    return Effect.gen(function* () {
      log('scheduling operation', { opKey: op.meta.key, ...options });
      yield* Ref.update(pendingCount, (count) => count + 1);
      // Scheduled operations are explicitly detached from the current process
      // — that's the whole point of `schedule` over `invoke`. Spawning without
      // a parentProcessId means the new process doesn't appear in the
      // spawning process's child set, doesn't deliver `requestChildEvent`
      // notifications, and the parent's terminal state isn't perturbed by
      // late child exits.
      const fiber = yield* invokeFiber(op, input, {
        detached: true,
        traceMeta,
        notify: options?.notify,
        environment: {
          ...(options?.spaceId !== undefined ? { space: options.spaceId } : {}),
          ...(options?.conversation !== undefined ? { conversation: options.conversation } : {}),
        },
      }).pipe(
        Effect.ensuring(Ref.update(pendingCount, (count) => count - 1)),
        Effect.tapErrorCause((cause) =>
          Effect.sync(() => {
            if (Cause.isInterruptedOnly(cause)) {
              log.warn('scheduled operation interrupted', { opKey: op.meta.key });
            } else {
              log.error('scheduled operation failed', { opKey: op.meta.key, cause: Cause.pretty(cause) });
            }
          }),
        ),
        Effect.ignore,
        Effect.forkDaemon,
      );
      pendingFibers.add(fiber);
      fiber.addObserver(() => {
        pendingFibers.delete(fiber);
      });
    }).pipe(
      Effect.onInterrupt(() =>
        Effect.sync(() => {
          log('operation schedule interrupted', { opKey: op.meta.key });
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

  // The process-based invoker has no separate "core" path that bypasses
  // event emission, so `_invokeCore` aliases `invoke`. HistoryTracker uses
  // `_invokeCore` for undo invocations to avoid feedback loops; with the
  // process-based invoker each undo still publishes an event, but the
  // mapping registry filters undo operations out of the history.
  const _invokeCore: OperationInvoker.OperationInvokerInternal['_invokeCore'] = (op, input, options) =>
    invoke(op, input, options) as any;

  const awaitFollowups: Effect.Effect<void> = Effect.suspend(() =>
    Fiber.awaitAll(Array.from(pendingFibers)).pipe(Effect.asVoid),
  );

  return {
    invoke,
    schedule,
    invokePromise,
    invokeFiber,
    attachFiber,
    invocations: pubsub,
    pendingFollowups: Ref.get(pendingCount),
    awaitFollowups,
    _invokeCore,
    setUndoResolver,
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
