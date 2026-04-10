//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import * as Ref from 'effect/Ref';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { DXN, Obj } from '@dxos/echo';
import { Performance } from '@dxos/effect';
import { runAndForwardErrors } from '@dxos/effect';
import { Process, ServiceResolver, Trace, TracingService } from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Operation, OperationHandlerSet, type OperationInvoker } from '@dxos/operation';
import type { ObjectId } from '@dxos/protocols';

import { ProcessNotFoundError } from '../errors';
import * as StorageService from './StorageService';

export interface Status {
  readonly state: Process.State;
  readonly exit: Option.Option<Exit.Exit<void>>;

  readonly startedAt: Date;
  readonly completedAt: Option.Option<Date>;
}

export interface Handle<I, O> {
  readonly pid: Process.ID;
  readonly parentId: Process.ID | null;

  /**
   * Process definition key ({@link Process.Process.key}) for this process.
   */
  readonly key: string;

  /**
   * Parameters of the process.
   */
  readonly params: Process.Params;

  /**
   * Environment influences what services are available to the process.
   */
  readonly environment: Environment;

  submitInput(input: I): Effect.Effect<void>;
  subscribeOutputs(): Stream.Stream<O>;

  /**
   * Subscribe to ephemeral trace messages for this process.
   * Replays buffered events, then streams new ones as they arrive.
   * The stream completes when the process reaches a terminal state.
   */
  subscribeEphemeral(): Stream.Stream<Trace.Message>;

  terminate(): Effect.Effect<void>;
  readonly status: Status;
  statusAtom: Atom.Atom<Status>;

  /**
   * Resolves when the process reaches {@link Process.State.IDLE} (nothing in-flight; waiting for input),
   * or a terminal state ({@link Process.State.SUCCEEDED}, {@link Process.State.TERMINATED}, {@link Process.State.FAILED}).
   *
   * Does not resolve while the process is {@link Process.State.HYBERNATING} (e.g. alarm pending or non-terminal child).
   * The effect keeps waiting until that external work finishes and the process becomes idle or terminal.
   *
   * If the process fails, this effect throws a defect.
   */
  runToCompletion(): Effect.Effect<void>;

  /**
   * Submits each input in order, then streams outputs until the process reaches {@link Process.State.IDLE}
   * or {@link Process.State.SUCCEEDED}. While {@link Process.State.HYBERNATING}, keeps waiting for outputs
   * or a terminal state. The stream fails with a defect if the process reaches {@link Process.State.FAILED}
   * or {@link Process.State.TERMINATED}.
   */
  runAndExit(options: { readonly inputs: readonly I[] }): Stream.Stream<O>;
}

export namespace Handle {
  export type Any = Handle<any, any>;
}

/**
 * Environment influences what services are available to the process.
 */
export interface Environment {
  readonly space?: SpaceId;
  readonly conversation?: DXN.String;
}

/**
 * Tracing metadata attached to a process spawn.
 */
export interface TracingOptions {
  /** Parent message ObjectId for trace context. */
  readonly message?: ObjectId;
  /** Tool call ID for trace context. */
  readonly toolCallId?: string;
  /**
   * Merged into {@link TracingService.traceInvocationStart} payload for root processes
   * (e.g. trigger id/kind and event data), together with built-in `process` metadata.
   */
  readonly invocationPayload?: Partial<TracingService.FunctionInvocationPayload>;
  /** Invoked function/workflow DXN (trace target). */
  readonly invocationTarget?: DXN;
}

/**
 * Options for spawning a process.
 */
export interface SpawnOptions {
  /** Parent process ID — child inherits the parent's trace context. */
  readonly parentProcessId?: Process.ID;

  /**
   * Process name for debugging purposes.
   */
  readonly name?: string;

  /**
   * Target object that this process is assigned to.
   */
  // TODO(dmaretskyi): Consider opaques metadata instead of opinionated `target` field.
  readonly target?: DXN.String;

  /**
   * Tracing metadata for this invocation.
   * @deprecated use `traceMeta` instead.
   */
  readonly tracing?: TracingOptions;

  /**
   * Tracing metadata for this invocation.
   */
  readonly traceMeta?: Trace.Meta;

  readonly environment?: Environment;
}

export interface ListOptions {
  /**
   * Filter processes by process definition key.
   */
  readonly key?: string;

  /**
   * Filter processes by parent process ID.
   */
  readonly parentProcessId?: Process.ID;

  /**
   * Filter processes by state.
   */
  readonly state?: Process.State;

  /**
   * Filter processes by target object ID.
   */
  readonly target?: DXN.String;
}

/**
 * API for managing processes.
 */
export interface Manager {
  /**
   * Spawn a new process from a process definition.
   */
  spawn<I, O>(definition: Process.Process<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>>;

  /**
   * Attach to an existing process.
   */
  attach<I, O>(id: Process.ID): Effect.Effect<Handle<I, O>>;

  /**
   * List all spawned processes.
   */
  list(options?: ListOptions): Effect.Effect<readonly Handle.Any[]>;

  runAllProcessesToCompletion(): Effect.Effect<void>;

  /**
   * Terminates all spawned processes (e.g. when tearing down the manager layer).
   */
  shutdown(): Effect.Effect<void>;

  /**
   * Operation handlers supplied at construction (same set used for nested {@link Operation.Service} in processes).
   */
  readonly operationHandlerSet: OperationHandlerSet.OperationHandlerSet;
}

/**
 * Tag for the ProcessManager service.
 */
export class ProcessManagerService extends Context.Tag('@dxos/functions-runtime/ProcessManagerService')<
  ProcessManagerService,
  Manager
>() {}

/**
 * Output queue uses Option to signal completion: Some(value) for data, None for end-of-stream.
 */
type OutputItem<O> = Option.Option<O>;

class ProcessHandleImpl<I, O, R> implements Handle<I, O> {
  readonly statusAtom: Atom.Writable<Status>;
  readonly parentId: Process.ID | null;
  readonly environment: Environment;

  #currentStatus: Status;
  #activeHandlers = 0;
  #finished = false;
  #succeedRequested = false;
  #failError: Error | null = null;
  readonly key: string;
  readonly params: Process.Params;
  #wallTimeMs = 0;
  #inputCount = 0;
  #outputCount = 0;
  #alarmTimer: ReturnType<typeof setTimeout> | null = null;
  #services: Context.Context<R | Process.BaseServices>;
  #alarmSemaphore = Effect.runSync(Effect.makeSemaphore(1));

  readonly #callbacks: Process.Callbacks<I, O, R>;
  readonly #scope: Scope.CloseableScope;
  readonly #registry: Registry.Registry;
  readonly #outputQueue: Queue.Queue<OutputItem<O>>;
  readonly #storage: Context.Tag.Service<typeof StorageService.StorageService>;
  readonly #traceSink: Trace.Sink;

  readonly #ephemeralBuffer = new EphemralTraceBuffer();
  readonly #ephemeralSubscribers: Queue.Queue<Option.Option<Trace.Message>>[] = [];

  readonly #onFinished: ((state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>) | undefined;
  readonly #onStatusChanged: (() => void) | undefined;
  readonly #hasRunningChildren: () => boolean;

  constructor(
    readonly pid: Process.ID,
    parentId: Process.ID | null,
    callbacks: Process.Callbacks<I, O, R>,
    scope: Scope.CloseableScope,
    services: Context.Context<R | Process.BaseServices>,
    registry: Registry.Registry,
    outputQueue: Queue.Queue<OutputItem<O>>,
    storage: Context.Tag.Service<typeof StorageService.StorageService>,
    key: string,
    params: Process.Params,
    environment: Environment,
    traceSink: Trace.Sink,
    onFinished?: (state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>,
    onStatusChanged?: () => void,
    hasRunningChildren?: () => boolean,
  ) {
    this.parentId = parentId;
    this.key = key;
    this.params = params;
    this.environment = environment;
    this.#callbacks = callbacks;
    this.#scope = scope;
    this.#services = services;
    this.#registry = registry;
    this.#outputQueue = outputQueue;
    this.#traceSink = traceSink;
    this.#storage = storage;
    this.#onFinished = onFinished;
    this.#onStatusChanged = onStatusChanged;
    this.#hasRunningChildren = hasRunningChildren ?? (() => false);

    this.#currentStatus = {
      state: Process.State.RUNNING,
      exit: Option.none(),
      startedAt: new Date(),
      completedAt: Option.none(),
    };
    this.statusAtom = Atom.make<Status>(this.#currentStatus);
    this.#registry.mount(this.statusAtom);
    log('lifecycle: created', { parentId, key, params });
  }

  snapshotStatus(): Status {
    return this.#currentStatus;
  }

  snapshotProcessInfo(): Process.Info {
    const status = this.#currentStatus;
    const error = Option.getOrNull(
      Option.flatMap(status.exit, (ex) =>
        Exit.match(ex, {
          onFailure: (cause) => Option.some(Cause.pretty(cause)),
          onSuccess: () => Option.none(),
        }),
      ),
    );
    return {
      pid: this.pid,
      parentPid: this.parentId,
      key: this.key,
      params: this.params,
      state: status.state,
      error,
      startedAt: status.startedAt.getTime(),
      completedAt: Option.map(status.completedAt, (date) => date.getTime()),
      metrics: {
        wallTime: this.#wallTimeMs,
        inputCount: this.#inputCount,
        outputCount: this.#outputCount,
      },
    };
  }

  /** Run process onSpawn. Called by ProcessManagerImpl after spawn. */
  runOnSpawn(): Effect.Effect<void> {
    log('lifecycle: onspawn');
    return this.#runHandler('spawn', () => this.#callbacks.onSpawn()).pipe(Effect.flatMap(Fiber.join));
  }

  submitInput(input: I): Effect.Effect<void> {
    if (this.#finished) {
      return Effect.void;
    }
    this.#inputCount++;
    log('lifecycle: input', { n: this.#inputCount });
    return this.#runHandler('input', () => this.#callbacks.onInput(input)).pipe(Effect.asVoid);
  }

  subscribeOutputs(): Stream.Stream<O> {
    return Stream.fromQueue(this.#outputQueue).pipe(Stream.takeWhile(Option.isSome), Stream.map(Option.getOrThrow));
  }

  pushEphemeral(event: Trace.Message): void {
    this.#ephemeralBuffer.push(event);
    for (const queue of this.#ephemeralSubscribers) {
      Queue.unsafeOffer(queue, Option.some(event));
    }
  }

  subscribeEphemeral(): Stream.Stream<Trace.Message> {
    return Stream.unwrap(
      Effect.gen(this, function* () {
        const snapshot = [...this.#ephemeralBuffer.buffer];
        const queue = yield* Queue.unbounded<Option.Option<Trace.Message>>();
        this.#ephemeralSubscribers.push(queue);
        return Stream.concat(
          Stream.fromIterable(snapshot),
          Stream.fromQueue(queue).pipe(Stream.takeWhile(Option.isSome), Stream.map(Option.getOrThrow)),
        );
      }),
    );
  }

  terminate(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      if (this.#finished) {
        log('lifecycle: terminate skipped (already finished)');
        return;
      }
      log('lifecycle: terminating');
      this.#finished = true;
      this.#setStatus(Process.State.TERMINATING);
      yield* this.#cleanup();
      this.#setStatus(Process.State.TERMINATED, Exit.void);
    });
  }

  runToCompletion(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const deferred = yield* Deferred.make<void>();
      const unsubscribe = this.#registry.subscribe(
        this.statusAtom,
        (state) => {
          switch (state.state) {
            case Process.State.SUCCEEDED:
            case Process.State.TERMINATED:
            case Process.State.IDLE:
              return Effect.runSync(Deferred.succeed(deferred, undefined));
            case Process.State.FAILED:
              const error = state.exit.pipe(
                Option.flatMap(Exit.causeOption),
                Option.map(Cause.pretty),
                Option.getOrElse(() => 'Process failed with unknown error'),
              );
              return Effect.runSync(Deferred.die(deferred, error));
          }
        },
        { immediate: true },
      );
      yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));
      yield* Deferred.await(deferred);
    }).pipe(Effect.scoped);
  }

  runAndExit(options: { readonly inputs: readonly I[] }): Stream.Stream<O> {
    const { inputs } = options;
    return Stream.unwrap(
      Effect.gen(this, function* () {
        // Make sure we dont miss any outputs.
        const outputs = this.subscribeOutputs().pipe(Stream.interruptWhen(this.#runAndExitInterruptEffect()));
        yield* Effect.forEach(inputs, (input) => this.submitInput(input));
        yield* this.#assertRunAndExitProcessActive();
        return outputs;
      }),
    );
  }

  #assertRunAndExitProcessActive(): Effect.Effect<void> {
    const { state, exit } = this.#currentStatus;
    if (state === Process.State.TERMINATED) {
      return Effect.dieMessage('Process was terminated');
    }
    if (state === Process.State.FAILED) {
      const message = exit.pipe(
        Option.flatMap(Exit.causeOption),
        Option.map(Cause.pretty),
        Option.getOrElse(() => 'Process failed with unknown error'),
      );
      return Effect.die(message);
    }
    return Effect.void;
  }

  /**
   * Completes when the process becomes IDLE or SUCCEEDED (interrupt output stream). Defects on FAILED or TERMINATED.
   */
  #runAndExitInterruptEffect(): Effect.Effect<void, never, never> {
    return Effect.gen(this, function* () {
      const deferred = yield* Deferred.make<void>();
      const unsubscribe = this.#registry.subscribe(
        this.statusAtom,
        (state) => {
          switch (state.state) {
            case Process.State.IDLE:
            case Process.State.SUCCEEDED:
              return Effect.runSync(Deferred.succeed(deferred, undefined));
            case Process.State.FAILED: {
              const error = state.exit.pipe(
                Option.flatMap(Exit.causeOption),
                Option.map(Cause.pretty),
                Option.getOrElse(() => 'Process failed with unknown error'),
              );
              return Effect.runSync(Deferred.die(deferred, error));
            }
            case Process.State.TERMINATED:
              return Effect.runSync(Deferred.die(deferred, 'Process was terminated'));
            default:
              return Effect.void;
          }
        },
        { immediate: true },
      );
      yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));
      yield* Deferred.await(deferred);
    }).pipe(Effect.scoped);
  }

  get status(): Status {
    return this.#currentStatus;
  }

  requestSucceed(): void {
    this.#succeedRequested = true;
  }

  requestFail(error: Error): void {
    this.#failError = error;
  }

  // TODO(dmaretskyi): Update to make it prefer the earliest alarm.
  requestAlarm(timeout?: number): void {
    if (this.#finished) return;
    this.#clearAlarm();
    const delay = timeout ?? 0;
    log('lifecycle: alarm scheduled', { delayMs: delay });
    this.#alarmTimer = setTimeout(() => {
      this.#alarmTimer = null;
      if (!this.#finished) {
        Effect.runFork(
          this.#runHandler('alarm', () => this.#callbacks.onAlarm()).pipe(
            Effect.flatMap(Fiber.join),
            this.#alarmSemaphore.withPermits(1),
          ),
        );
      }
    }, delay);
  }

  requestSubmitOutput(output: O): void {
    log('lifecycle: submit output', { pid: this.pid });
    this.#outputCount++;
    this.#onStatusChanged?.();
    Queue.unsafeOffer(this.#outputQueue, Option.some(output));
  }

  requestChildEvent(event: Process.ChildEvent<unknown>): void {
    log('lifecycle: child event', { tag: event._tag, childPid: event.pid });
    Effect.runFork(this.#runHandler('childEvent', () => this.#callbacks.onChildEvent(event)));
  }

  #runHandler(
    name: string,
    fn: () => Effect.Effect<void, never, R | Process.BaseServices>,
  ): Effect.Effect<Fiber.RuntimeFiber<void>> {
    return Effect.uninterruptibleMask((restore) =>
      Effect.gen(this, function* () {
        this.#activeHandlers++;
        this.#setStatus(Process.State.RUNNING);
        log('begin handler', { pid: this.pid, state: this.#currentStatus.state, activeHandlers: this.#activeHandlers });
        const t0 = performance.now();
        const recordWall = () => {
          this.#wallTimeMs += performance.now() - t0;
        };
        return yield* restore(fn()).pipe(
          Effect.provide(this.#services),
          Effect.tap(() => Effect.sync(recordWall)),
          Performance.addTrackEntry({
            name,
            detail: {
              pid: this.pid,
              key: this.key,
              params: this.params,
            },
            devtools: {
              dataType: 'track-entry',
              track: 'Process',
              trackGroup: 'Compute',
              color: 'primary',
            },
          }),
          Effect.tap(() => this.#handlerCompleted()),
          Effect.catchAllCause((cause) =>
            Effect.gen(this, function* () {
              recordWall();
              yield* this.#handleError(cause);
            }),
          ),
          Effect.forkIn(this.#scope),
        );
      }),
    );
  }

  #handlerCompleted(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this.#activeHandlers--;
      log('handler completed', { pid: this.pid, activeHandlers: this.#activeHandlers, finished: this.#finished });

      if (this.#finished) return;

      if (this.#failError !== null && this.#activeHandlers === 0) {
        this.#finished = true;
        const error = this.#failError;
        yield* this.#cleanup().pipe(
          Effect.tap(() => this.#setStatus(Process.State.FAILED, Exit.die(error))),
          Effect.tap(() => this.#onFinished?.(Process.State.FAILED, Cause.die(error)) ?? Effect.void),
        );
      } else if (this.#succeedRequested && this.#activeHandlers === 0) {
        this.#finished = true;
        yield* this.#cleanup().pipe(
          Effect.tap(() => this.#setStatus(Process.State.SUCCEEDED, Exit.void)),
          Effect.tap(() => this.#onFinished?.(Process.State.SUCCEEDED) ?? Effect.void),
        );
      } else if (this.#activeHandlers === 0) {
        const hybernating = this.#alarmTimer !== null || this.#hasRunningChildren();
        this.#setStatus(hybernating ? Process.State.HYBERNATING : Process.State.IDLE);
      }
    });
  }

  #handleError(cause: Cause.Cause<never>): Effect.Effect<void> {
    this.#activeHandlers--;
    if (this.#finished) {
      log('lifecycle: failure ignored (already finished)');
      return Effect.void;
    }
    log('lifecycle: failed', { cause: Cause.pretty(cause) });
    this.#finished = true;
    return this.#cleanup().pipe(
      Effect.tap(() => this.#setStatus(Process.State.FAILED, Exit.failCause(cause))),
      Effect.tap(() => this.#onFinished?.(Process.State.FAILED, cause) ?? Effect.void),
    );
  }

  #cleanup(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      log('lifecycle: cleanup');
      this.#clearAlarm();
      Queue.unsafeOffer(this.#outputQueue, Option.none());
      for (const queue of this.#ephemeralSubscribers) {
        Queue.unsafeOffer(queue, Option.none());
      }
      this.#ephemeralSubscribers.length = 0;
      yield* this.#storage.clear();
      yield* Scope.close(this.#scope, Exit.void);
    });
  }

  #clearAlarm(): void {
    if (this.#alarmTimer !== null) {
      clearTimeout(this.#alarmTimer);
      this.#alarmTimer = null;
    }
  }

  #setStatus(state: Process.State, exit?: Exit.Exit<void>) {
    if (state !== this.#currentStatus.state) {
      log('lifecycle: state', { state, previous: this.#currentStatus.state });
    }
    const isTerminal =
      state === Process.State.SUCCEEDED || state === Process.State.TERMINATED || state === Process.State.FAILED;
    this.#currentStatus = {
      state,
      exit: exit ? Option.some(exit) : Option.none(),
      startedAt: this.#currentStatus.startedAt,
      completedAt: isTerminal ? Option.some(new Date()) : Option.none(),
    };
    log('state updated', { pid: this.pid, state });
    this.#registry.set(this.statusAtom, this.#currentStatus);
    this.#onStatusChanged?.();
  }
}

export interface ProcessManagerImplOpts {
  registry: Registry.Registry;
  kvStore: KeyValueStore.KeyValueStore;
  traceSink: Trace.Sink;
  serviceResolver?: ServiceResolver.ServiceResolver;
  tracingService?: Context.Tag.Service<TracingService>;
  handlerSet?: OperationHandlerSet.OperationHandlerSet;
  idGenerator?: ProcessIdGenerator;
}

export class ProcessManagerImpl implements Manager {
  readonly #idGenerator: ProcessIdGenerator;
  readonly #handles = new Map<Process.ID, ProcessHandleImpl<any, any, any>>();
  readonly #traceContexts = new Map<Process.ID, TracingService.TraceContext>();
  readonly #registry: Registry.Registry;
  readonly #kvStore: KeyValueStore.KeyValueStore;
  readonly #serviceResolver: ServiceResolver.ServiceResolver;
  readonly #tracingService: Context.Tag.Service<TracingService>;
  readonly #handlerSet: OperationHandlerSet.OperationHandlerSet | undefined;
  readonly #traceSink: Trace.Sink;

  readonly #processTreeAtom: Atom.Writable<readonly Process.Info[]>;
  readonly #monitor: Process.Monitor;

  constructor(opts: ProcessManagerImplOpts) {
    this.#idGenerator = opts.idGenerator ?? UUIDProcessIdGenerator;
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
    this.#serviceResolver = opts.serviceResolver ?? ServiceResolver.empty;
    this.#tracingService = opts.tracingService ?? TracingService.noop;
    this.#handlerSet = opts.handlerSet;
    this.#traceSink = opts.traceSink;
    this.#processTreeAtom = Atom.make<readonly Process.Info[]>([]);
    this.#registry.mount(this.#processTreeAtom);
    this.#monitor = {
      processTree: Effect.sync(() => this.#registry.get(this.#processTreeAtom)),
      processTreeAtom: this.#processTreeAtom,
    };
  }

  get monitor(): Process.Monitor {
    return this.#monitor;
  }

  get operationHandlerSet(): OperationHandlerSet.OperationHandlerSet {
    return this.#handlerSet ?? OperationHandlerSet.empty;
  }

  #hasNonTerminalChildren(parentPid: Process.ID): boolean {
    for (const handle of this.#handles.values()) {
      if (handle.parentId === parentPid) {
        const { state } = handle.snapshotStatus();
        if (state !== Process.State.SUCCEEDED && state !== Process.State.FAILED && state !== Process.State.TERMINATED) {
          return true;
        }
      }
    }
    return false;
  }

  #buildProcessTreeSnapshot(): readonly Process.Info[] {
    return [...this.#handles.values()].map((handle) => handle.snapshotProcessInfo());
  }

  #refreshProcessTree(): void {
    this.#registry.set(this.#processTreeAtom, this.#buildProcessTreeSnapshot());
  }

  /**
   * Terminates every spawned process handle (children before parents), clears alarms, and empties the handle map.
   * Safe to call when there are no handles. Per-handle `terminate` is idempotent.
   */
  // TODO(dmaretskyi): Make it so that the ProcessManager is durable, then this will not terminate processes. just stop scheduling callbacks.
  shutdown(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const handleCount = this.#handles.size;
      if (handleCount === 0) {
        log('lifecycle: manager shutdown skipped');
        return;
      }
      log('lifecycle: manager shutting down', { handleCount, pids: [...this.#handles.keys()] });
      const order = this.#shutdownTerminationOrder();
      for (const handle of order) {
        yield* handle.terminate();
      }
      this.#handles.clear();
      this.#refreshProcessTree();
      log('lifecycle: manager shutdown complete', { terminated: order.length });
    });
  }

  /**
   * Pids with no pending children in the handle map first, so child processes shut down before parents.
   */
  #shutdownTerminationOrder(): ProcessHandleImpl<any, any, any>[] {
    const byPid = new Map(this.#handles);
    const pending = new Set<Process.ID>(byPid.keys());
    const result: ProcessHandleImpl<any, any, any>[] = [];

    const pendingChildCount = (pid: Process.ID): number => {
      let count = 0;
      for (const childPid of pending) {
        const child = byPid.get(childPid)!;
        if (child.parentId === pid) {
          count++;
        }
      }
      return count;
    };

    while (pending.size > 0) {
      let leaves = [...pending].filter((pid) => pendingChildCount(pid) === 0);
      if (leaves.length === 0) {
        leaves = [[...pending][0]!];
      }
      for (const pid of leaves) {
        pending.delete(pid);
        const handle = byPid.get(pid);
        if (handle) {
          result.push(handle);
        }
      }
    }

    return result;
  }

  spawn<I, O>(definition: Process.Process<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>> {
    return Effect.gen(this, function* () {
      const id = this.#idGenerator();
      log('lifecycle: spawn', {
        pid: id,
        key: definition.key,
        parentPid: options?.parentProcessId,
        name: options?.name,
      });
      const scope = yield* Scope.make();
      const outputQueue = yield* Queue.unbounded<OutputItem<O>>();

      const storage = StorageService.layer(this.#kvStore, `process/${id}/`);

      const parentOption = Option.fromNullable(options?.parentProcessId);

      const parentHandle =
        options?.parentProcessId !== undefined ? this.#handles.get(options.parentProcessId) : undefined;
      const environment: Environment = {
        ...(parentHandle !== undefined ? parentHandle.environment : {}),
        ...options?.environment,
      };

      const resolutionContext: ServiceResolver.ResolutionContext = {
        space: environment.space,
        conversation: environment.conversation,
        process: id,
      };

      let handleRef: ProcessHandleImpl<I, O, any> | null = null;

      const params: Process.Params = {
        name: options?.name ?? null,
        target: options?.target ?? null,
      };

      const ctx: Process.ProcessContext<I, O> = {
        id,
        params,
        succeed: () => {
          handleRef?.requestSucceed();
        },
        fail: (error: Error) => {
          handleRef?.requestFail(error);
        },
        submitOutput: (output: O) => {
          handleRef?.requestSubmitOutput(output);
        },
        setAlarm: (timeout?: number) => {
          handleRef?.requestAlarm(timeout);
        },
      };

      // Build tracing context for this process.
      const traceContext = yield* this.#buildTraceContext(id, options);
      this.#traceContexts.set(id, traceContext);

      const isRoot = !options?.parentProcessId;

      // Trace invocation start for root processes (no parent).
      let invocationTrace: TracingService.InvocationTraceData | undefined;
      if (isRoot) {
        const processPayload = {
          pid: id,
          key: definition.key,
          name: params.name ?? undefined,
          target: params.target != null ? String(params.target) : undefined,
        };
        const mergedPayload: TracingService.FunctionInvocationPayload = {
          ...options?.tracing?.invocationPayload,
          process: processPayload,
        };
        invocationTrace = yield* this.#tracingService.traceInvocationStart({
          payload: mergedPayload,
          target: options?.tracing?.invocationTarget,
        });
        this.#traceContexts.set(id, { ...traceContext, currentInvocation: invocationTrace });
      }

      // Create TracingService scoped to this process's trace context.
      log('process trace config', { pid: id, invocationTrace });
      const invocationTracingService = invocationTrace?.invocationTraceQueue
        ? yield* TracingService.pipe(
            Effect.provide(
              TracingService.layerInvocation(invocationTrace).pipe(
                Layer.provide(Layer.succeed(TracingService, this.#tracingService)),
              ),
            ),
          )
        : this.#tracingService;
      const processTracingService: Context.Tag.Service<TracingService> = {
        getTraceContext: () => traceContext,
        write: (event, traceCtx) => {
          log('trace event', { pid: id, event: JSON.stringify(event), traceCtx: JSON.stringify(traceCtx) });
          invocationTracingService.write(event, traceCtx);
        },
        ephemeral: (event, traceCtx) => {
          log('ephemeral trace event (deprecated)', {
            pid: id,
            event: JSON.stringify(event).slice(0, 50),
            traceCtx: JSON.stringify(traceCtx),
          });
          // handleRef?.pushEphemeral(event);
        },
        traceInvocationStart: (opts) => invocationTracingService.traceInvocationStart(opts),
        traceInvocationEnd: (opts) => invocationTracingService.traceInvocationEnd(opts),
      };

      let builtinCtx = Context.empty().pipe(
        Context.add(StorageService.StorageService, storage),
        Context.add(Scope.Scope, scope),
        Context.add(TracingService, processTracingService),
        Context.add(Trace.TraceService, {
          write: (event, data) => {
            // TODO(dmaretskyi): Batching.
            const message = Obj.make(Trace.Message, {
              meta: {
                ...(options?.traceMeta ?? {}),
                pid: id,
                parentPid: options?.parentProcessId,
                processName: params.name ?? undefined,
              },
              isEphemeral: event.isEphemeral,
              events: [
                {
                  type: event.key,
                  timestamp: Date.now(),
                  data,
                },
              ],
            });
            if (message.isEphemeral) {
              handleRef?.pushEphemeral(message);
            } else {
              this.#traceSink.write(message);
            }
          },
        }),
      );

      // Provide Operation.Service that spawns child processes with parentProcessId set.
      if (this.#handlerSet) {
        const childInvoker = ProcessOperationInvoker.make({
          manager: this,
          handlerSet: this.#handlerSet,
          parentProcessId: id,
        });
        builtinCtx = Context.add(builtinCtx, Operation.Service, childInvoker);
        builtinCtx = Context.add(builtinCtx, ProcessOperationInvoker.Service, childInvoker);
      }

      const builtinTagKeys = new Set([
        StorageService.StorageService.key,
        Scope.Scope.key,
        TracingService.key,
        Trace.TraceService.key,
        Operation.Service.key,
        ProcessOperationInvoker.Service.key,
      ]);
      const externalServices = definition.services.filter((tag: Context.Tag<any, any>) => !builtinTagKeys.has(tag.key));

      let serviceCtx: Context.Context<never> = Context.empty() as Context.Context<never>;
      if (externalServices.length > 0) {
        serviceCtx = yield* ServiceResolver.resolveAll(externalServices, resolutionContext).pipe(
          Effect.provideService(ServiceResolver.ServiceResolver, this.#serviceResolver),
          Effect.provideService(Scope.Scope, scope),
          Effect.orDie,
        );
      }

      const fullCtx = Context.merge(builtinCtx, serviceCtx);

      const callbacks = yield* definition.create(ctx).pipe(Effect.provide(fullCtx as Context.Context<any>));

      const onFinished = (state: Process.State, cause?: Cause.Cause<never>): Effect.Effect<void> =>
        Effect.gen(this, function* () {
          log('lifecycle: ended', { pid: handle.pid, state });
          if (handle.parentId !== null) {
            const parentHandle = this.#handles.get(handle.parentId);
            if (parentHandle) {
              log('lifecycle: notify parent', { parentPid: handle.parentId, childPid: handle.pid });
              parentHandle.requestChildEvent({
                _tag: 'exited',
                pid: handle.pid,
                result: cause ? Exit.failCause(cause) : Exit.succeed(undefined),
              });
            } else {
              log.warn('lifecycle: parent missing for child exit', {
                parentPid: handle.parentId,
                childPid: handle.pid,
              });
            }
          }

          // Call traceInvocationEnd for root processes.
          if (isRoot && invocationTrace) {
            const exception = state === Process.State.FAILED && cause ? cause : undefined;
            yield* this.#tracingService.traceInvocationEnd({ trace: invocationTrace, exception });
          }
          this.#traceContexts.delete(id);
        });

      const handle = new ProcessHandleImpl<I, O, any>(
        id,
        Option.getOrNull(parentOption),
        callbacks,
        scope,
        fullCtx,
        this.#registry,
        outputQueue,
        storage,
        definition.key,
        params,
        environment,
        this.#traceSink,
        onFinished,
        () => this.#refreshProcessTree(),
        () => this.#hasNonTerminalChildren(id),
      );
      handleRef = handle;
      this.#handles.set(id, handle);
      this.#refreshProcessTree();

      // TODO(dmaretskyi): Background?
      yield* handle.runOnSpawn();
      log('lifecycle: started', { pid: id, key: definition.key });

      return handle;
    });
  }

  /**
   * Build trace context for a process, inheriting from parent if specified.
   */
  #buildTraceContext(_id: Process.ID, options?: SpawnOptions): Effect.Effect<TracingService.TraceContext> {
    return Effect.sync(() => {
      let baseContext: TracingService.TraceContext = {};

      if (options?.parentProcessId) {
        const parentContext = this.#traceContexts.get(options.parentProcessId);
        if (parentContext) {
          baseContext = { ...parentContext };
        }
      }

      if (options?.tracing) {
        if (options.tracing.message !== undefined) {
          baseContext = { ...baseContext, parentMessage: options.tracing.message };
        }
        if (options.tracing.toolCallId !== undefined) {
          baseContext = { ...baseContext, toolCallId: options.tracing.toolCallId };
        }
      }

      return baseContext;
    });
  }

  getTraceContext(processId: Process.ID): TracingService.TraceContext | undefined {
    return this.#traceContexts.get(processId);
  }

  attach<I, O>(id: Process.ID): Effect.Effect<Handle<I, O>> {
    return Effect.gen(this, function* () {
      const handle = this.#handles.get(id);
      if (!handle) {
        log('lifecycle: attach failed (not found)', { pid: id });
        return yield* Effect.die(new Error(`Process not found: ${id}`));
      }
      log('lifecycle: attached', { key: handle.key, state: handle.snapshotStatus().state });
      return handle as unknown as Handle<I, O>;
    });
  }

  list(options?: ListOptions): Effect.Effect<readonly Handle.Any[]> {
    return Effect.sync(() => {
      let impls: ProcessHandleImpl<any, any, any>[] = [...this.#handles.values()];
      if (options?.key !== undefined) {
        impls = impls.filter((handle) => handle.key === options.key);
      }
      if (options?.parentProcessId !== undefined) {
        impls = impls.filter((handle) => handle.parentId === options.parentProcessId);
      }
      if (options?.state !== undefined) {
        impls = impls.filter((handle) => handle.snapshotStatus().state === options.state);
      }
      if (options?.target !== undefined) {
        impls = impls.filter((handle) => handle.params.target === options.target);
      }
      return impls;
    });
  }

  runAllProcessesToCompletion(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const handles = [...this.#handles.values()];
      log('lifecycle: await all processes', { count: handles.length });
      yield* Effect.forEach(handles, (handle) => handle.runToCompletion(), {
        concurrency: 'unbounded',
        discard: true,
      });
    });
  }
}

export type ProcessIdGenerator = () => Process.ID;

/**
 * Generates a random process id (UUID string).
 */
export const UUIDProcessIdGenerator: ProcessIdGenerator = () => Process.ID.make(crypto.randomUUID());

/**
 * Generates sequential string process ids (`0`, `1`, …); useful in tests.
 */
export const SequentialProcessIdGenerator: ProcessIdGenerator = (() => {
  let nextId = 0;
  return () => Process.ID.make(String(nextId++));
})();

/**
 * Scoped layer that provides ProcessManager and ProcessMonitorService.
 * On scope close, the manager's `shutdown()` runs (layer finalizer), stopping
 * alarms and process work so the shared Atom registry is not updated after disposal.
 *
 * Requires KeyValueStore, ServiceResolver, TracingService, OperationHandlerSet.OperationHandlerProvider,
 * and Registry.AtomRegistry from the environment.
 */
export const layer = (opts?: {
  idGenerator?: ProcessIdGenerator;
}): Layer.Layer<
  ProcessManagerService | Process.ProcessMonitorService,
  never,
  | KeyValueStore.KeyValueStore
  | ServiceResolver.ServiceResolver
  | TracingService
  | OperationHandlerSet.OperationHandlerProvider
  | Registry.AtomRegistry
  | Trace.TraceSink
> =>
  Layer.scopedContext(
    Effect.gen(function* () {
      const kvStore = yield* KeyValueStore.KeyValueStore;
      const serviceResolver = yield* ServiceResolver.ServiceResolver;
      const tracingService = yield* TracingService;

      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const registry = yield* Registry.AtomRegistry;
      const traceSink = yield* Trace.TraceSink;

      const manager = new ProcessManagerImpl({
        registry,
        kvStore,
        traceSink,
        serviceResolver,
        tracingService,
        handlerSet,
        idGenerator: opts?.idGenerator,
      });

      yield* Effect.addFinalizer(() => manager.shutdown());

      return Context.mergeAll(
        Context.make(ProcessManagerService, manager),
        Context.make(Process.ProcessMonitorService, manager.monitor),
      );
    }),
  );

/**
 * Compacting circular buffer of ephemeral trace events.
 */
class EphemralTraceBuffer {
  #maxLength: number;
  #buffer: Trace.Message[] = [];

  constructor(maxLength: number = 25) {
    this.#maxLength = maxLength;
  }

  get buffer(): readonly Trace.Message[] {
    return this.#buffer;
  }

  push(event: Trace.Message): void {
    const id = typeof event.id === 'string' ? event.id : undefined;
    const buf = this.#buffer;
    if (id !== undefined) {
      let firstIdx = -1;
      for (let index = 0; index < buf.length; index++) {
        if (buf[index]!.id === id) {
          firstIdx = index;
          break;
        }
      }
      if (firstIdx !== -1) {
        let write = 0;
        for (let read = 0; read < buf.length; read++) {
          const item = buf[read]!;
          if (item.id === id) {
            if (read === firstIdx) {
              buf[write++] = event;
            }
          } else if (write !== read) {
            buf[write++] = item;
          } else {
            write++;
          }
        }
        buf.length = write;
        return;
      }
    }
    buf.push(event);
    if (buf.length > this.#maxLength) {
      buf.shift();
    }
  }

  clear(): void {
    this.#buffer.length = 0;
  }
}

// =============================================================================
// ProcessOperationInvoker (merged to avoid circular dependency)
// =============================================================================

export namespace ProcessOperationInvoker {
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
      options?: Pick<SpawnOptions, 'tracing' | 'environment'>,
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
        Effect.fork,
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
      options?: Pick<SpawnOptions, 'tracing' | 'environment'>,
    ): Effect.Effect<OperationFiber<O>> =>
      Effect.gen(function* () {
        const executable = Process.fromOperation(op, opts.handlerSet);

        const handle = yield* opts.manager.spawn(executable, {
          ...options,
          parentProcessId: opts.parentProcessId,
          name: op.meta.name ? `${op.meta.name} (${op.meta.key})` : op.meta.key,
        });
        log('lifecycle: operation process spawned', { opKey: op.meta.key, handle });

        yield* handle.submitInput(input);
        log('lifecycle: operation input submitted', { opKey: op.meta.key, handle });
        const fiber = yield* fiberFromProcess(handle);
        fiberCache.set(handle.pid, fiber);
        return fiber;
      });

    const attachFiber = <T>(pid: Process.ID): Effect.Effect<OperationFiber<T>> =>
      Effect.gen(function* () {
        log('lifecycle: attach to operation process', { pid });
        const handle = yield* opts.manager.attach<any, T>(pid);
        const fiber = fiberCache.get(pid);
        if (fiber) {
          return fiber;
        }
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
      const tracing = options?.tracing as TracingOptions | undefined;
      return Effect.gen(function* () {
        const fiber = yield* invokeFiber(op, input, { tracing, environment: { space: options?.spaceId } });
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
    ProcessManagerService | OperationHandlerSet.OperationHandlerProvider
  > = Layer.unwrapEffect(
    Effect.gen(function* () {
      const manager = yield* ProcessManagerService;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const service = make({ manager, handlerSet });
      return Layer.mergeAll(Layer.succeed(Operation.Service, service), Layer.succeed(Service, service));
    }),
  );
}
