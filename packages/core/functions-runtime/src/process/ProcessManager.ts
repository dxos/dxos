//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { TracingService } from '@dxos/functions';
import { OperationHandlerSet, Operation } from '@dxos/operation';

import * as Process from './Process';
import * as ProcessOperationInvoker from './ProcessOperationInvoker';
import * as ServiceResolver from './ServiceResolver';
import * as StorageService from './StorageService';
import type { ObjectId } from '@dxos/protocols';
import * as Deferred from 'effect/Deferred';
import { log } from '@dxos/log';

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
   * Executable key ({@link Process.Executable.key}) for this process.
   */
  readonly executableKey: string;

  /**
   * Parameters of the process.
   */
  readonly params: Process.Params;

  submitInput(input: I): Effect.Effect<void>;
  subscribeOutputs(): Stream.Stream<O>;

  terminate(): Effect.Effect<void>;
  status(): Effect.Effect<Status>;
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
  readonly parentProcessId?: Process.ID;

  /**
   * Process name for debugging purposes.
   */
  readonly name?: string;

  /**
   * Target object that this process is assigned to.
   */
  readonly target?: ObjectId;

  /** Tracing metadata for this invocation. */
  readonly tracing?: TracingOptions;
}

export interface ListOptions {
  /**
   * Filter processes by executable key.
   */
  readonly executableKey?: string;

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
  readonly target?: ObjectId;
}

/**
 * API for managing processes.
 */
export interface Manager {
  /**
   * Spawn a new process for an executable.
   */
  spawn<I, O>(executable: Process.Executable<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>>;

  /**
   * Attach to an existing process.
   */
  attach<I, O>(id: Process.ID): Effect.Effect<Handle<I, O>>;

  /**
   * List all spawned processes.
   */
  list(options?: ListOptions): Effect.Effect<readonly Handle.Any[]>;

  /**
   * Terminates all spawned processes (e.g. when tearing down the manager layer).
   */
  shutdown(): Effect.Effect<void>;
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

  #currentStatus: Status;
  #activeHandlers = 0;
  #finished = false;
  #succeedRequested = false;
  #failError: Error | null = null;
  readonly executableKey: string;
  readonly params: Process.Params;
  readonly #executableName: string | null;
  #wallTimeMs = 0;
  #inputCount = 0;
  #outputCount = 0;
  #alarmTimer: ReturnType<typeof setTimeout> | null = null;
  #services: Context.Context<R | Process.BaseServices>;
  #alarmSemaphore = Effect.runSync(Effect.makeSemaphore(1));

  readonly #process: Process.Process<I, O, R>;
  readonly #scope: Scope.CloseableScope;
  readonly #registry: Registry.Registry;
  readonly #outputQueue: Queue.Queue<OutputItem<O>>;
  readonly #storage: Context.Tag.Service<typeof StorageService.StorageService>;

  readonly #onFinished: ((state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>) | undefined;
  readonly #onStatusChanged: (() => void) | undefined;
  readonly #hasRunningChildren: () => boolean;

  constructor(
    readonly pid: Process.ID,
    parentId: Process.ID | null,
    process: Process.Process<I, O, R>,
    scope: Scope.CloseableScope,
    services: Context.Context<R | Process.BaseServices>,
    registry: Registry.Registry,
    outputQueue: Queue.Queue<OutputItem<O>>,
    storage: Context.Tag.Service<typeof StorageService.StorageService>,
    executableKey: string,
    executableName: string | null,
    params: Process.Params,
    onFinished?: (state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>,
    onStatusChanged?: () => void,
    hasRunningChildren?: () => boolean,
  ) {
    this.parentId = parentId;
    this.executableKey = executableKey;
    this.params = params;
    this.#executableName = executableName;
    this.#process = process;
    this.#scope = scope;
    this.#services = services;
    this.#registry = registry;
    this.#outputQueue = outputQueue;
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
  }

  snapshotStatus(): Status {
    return this.#currentStatus;
  }

  snapshotProcessInfo(): Process.ProcessInfo {
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
      executableKey: this.executableKey,
      executableName: this.#executableName,
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
    return this.#runHandler(() => this.#process.onSpawn());
  }

  submitInput(input: I): Effect.Effect<void> {
    if (this.#finished) {
      return Effect.void;
    }
    this.#inputCount++;
    return this.#runHandler(() => this.#process.onInput(input)).pipe(Effect.forkIn(this.#scope));
  }

  subscribeOutputs(): Stream.Stream<O> {
    return Stream.fromQueue(this.#outputQueue).pipe(Stream.takeWhile(Option.isSome), Stream.map(Option.getOrThrow));
  }

  terminate(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      if (this.#finished) {
        return;
      }
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

  status(): Effect.Effect<Status> {
    return Effect.sync(() => this.#currentStatus);
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
    this.#alarmTimer = setTimeout(() => {
      this.#alarmTimer = null;
      if (!this.#finished) {
        Effect.runFork(this.#runHandler(() => this.#process.onAlarm()).pipe(this.#alarmSemaphore.withPermits(1)));
      }
    }, delay);
  }

  requestSubmitOutput(output: O): void {
    this.#outputCount++;
    Queue.unsafeOffer(this.#outputQueue, Option.some(output));
  }

  requestChildEvent(event: Process.ChildEvent<unknown>): void {
    Effect.runFork(this.#runHandler(() => this.#process.onChildEvent(event)).pipe(Effect.forkIn(this.#scope)));
  }

  #runHandler(fn: () => Effect.Effect<void, never, R | Process.BaseServices>): Effect.Effect<void> {
    this.#activeHandlers++;
    this.#setStatus(Process.State.RUNNING);
    const t0 = performance.now();
    const recordWall = () => {
      this.#wallTimeMs += performance.now() - t0;
    };
    return fn().pipe(
      Effect.provide(this.#services),
      Effect.tap(() => Effect.sync(recordWall)),
      Effect.tap(() => this.#handlerCompleted()),
      Effect.catchAllCause((cause) =>
        Effect.gen(this, function* () {
          recordWall();
          yield* this.#handleError(cause);
        }),
      ),
    );
  }

  #handlerCompleted(): Effect.Effect<void> {
    this.#activeHandlers--;

    if (this.#finished) return Effect.void;

    if (this.#failError !== null && this.#activeHandlers === 0) {
      this.#finished = true;
      const error = this.#failError;
      return this.#cleanup().pipe(
        Effect.tap(() => this.#setStatus(Process.State.FAILED, Exit.die(error))),
        Effect.tap(() => this.#onFinished?.(Process.State.FAILED, Cause.die(error)) ?? Effect.void),
      );
    }

    if (this.#succeedRequested && this.#activeHandlers === 0) {
      this.#finished = true;
      return this.#cleanup().pipe(
        Effect.tap(() => this.#setStatus(Process.State.SUCCEEDED, Exit.void)),
        Effect.tap(() => this.#onFinished?.(Process.State.SUCCEEDED) ?? Effect.void),
      );
    }

    if (this.#activeHandlers === 0) {
      const hybernating = this.#alarmTimer !== null || this.#hasRunningChildren();
      this.#setStatus(hybernating ? Process.State.HYBERNATING : Process.State.IDLE);
    }
    return Effect.void;
  }

  #handleError(cause: Cause.Cause<never>): Effect.Effect<void> {
    this.#activeHandlers--;
    if (this.#finished) return Effect.void;
    this.#finished = true;
    return this.#cleanup().pipe(
      Effect.tap(() => this.#setStatus(Process.State.FAILED, Exit.failCause(cause))),
      Effect.tap(() => this.#onFinished?.(Process.State.FAILED, cause) ?? Effect.void),
    );
  }

  #cleanup(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this.#clearAlarm();
      Queue.unsafeOffer(this.#outputQueue, Option.none());
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
    log('setStatus', { pid: this.pid, state });
    const isTerminal =
      state === Process.State.SUCCEEDED || state === Process.State.TERMINATED || state === Process.State.FAILED;
    this.#currentStatus = {
      state,
      exit: exit ? Option.some(exit) : Option.none(),
      startedAt: this.#currentStatus.startedAt,
      completedAt: isTerminal ? Option.some(new Date()) : Option.none(),
    };
    this.#registry.set(this.statusAtom, this.#currentStatus);
    this.#onStatusChanged?.();
  }
}

export interface ProcessManagerImplOpts {
  registry: Registry.Registry;
  kvStore: KeyValueStore.KeyValueStore;
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

  readonly #processTreeAtom: Atom.Writable<readonly Process.ProcessInfo[]>;
  readonly #monitor: Process.Monitor;

  constructor(opts: ProcessManagerImplOpts) {
    this.#idGenerator = opts.idGenerator ?? UUIDProcessIdGenerator;
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
    this.#serviceResolver = opts.serviceResolver ?? ServiceResolver.empty;
    this.#tracingService = opts.tracingService ?? TracingService.noop;
    this.#handlerSet = opts.handlerSet;

    this.#processTreeAtom = Atom.make<readonly Process.ProcessInfo[]>([]);
    this.#registry.mount(this.#processTreeAtom);
    this.#monitor = {
      processTree: Effect.sync(() => this.#registry.get(this.#processTreeAtom)),
      processTreeAtom: this.#processTreeAtom,
    };
  }

  get monitor(): Process.Monitor {
    return this.#monitor;
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

  #buildProcessTreeSnapshot(): readonly Process.ProcessInfo[] {
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
      if (this.#handles.size === 0) {
        return;
      }
      const order = this.#shutdownTerminationOrder();
      for (const handle of order) {
        yield* handle.terminate();
      }
      this.#handles.clear();
      this.#refreshProcessTree();
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

  spawn<I, O>(executable: Process.Executable<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>> {
    return Effect.gen(this, function* () {
      const id = this.#idGenerator();
      log.info('spawn', { pid: id, parentPid: options?.parentProcessId });
      const scope = yield* Scope.make();
      const outputQueue = yield* Queue.unbounded<OutputItem<O>>();

      const storage = StorageService.layer(this.#kvStore, `process/${id}/`);

      const parentOption = Option.fromNullable(options?.parentProcessId);

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

      // Create TracingService scoped to this process's trace context.
      const processTracingService: Context.Tag.Service<TracingService> = {
        getTraceContext: () => traceContext,
        write: (event, traceCtx) => this.#tracingService.write(event, traceCtx),
        traceInvocationStart: (opts) => this.#tracingService.traceInvocationStart(opts),
        traceInvocationEnd: (opts) => this.#tracingService.traceInvocationEnd(opts),
      };

      let builtinCtx = Context.empty().pipe(
        Context.add(StorageService.StorageService, storage),
        Context.add(Scope.Scope, scope),
        Context.add(TracingService, processTracingService),
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
        Operation.Service.key,
        ProcessOperationInvoker.Service.key,
      ]);
      const externalServices = executable.services.filter((tag: Context.Tag<any, any>) => !builtinTagKeys.has(tag.key));

      let serviceCtx: Context.Context<never> = Context.empty() as Context.Context<never>;
      if (externalServices.length > 0) {
        serviceCtx = yield* this.#serviceResolver.resolve(externalServices).pipe(Effect.orDie);
      }

      const fullCtx = Context.merge(builtinCtx, serviceCtx);

      const process = yield* executable.create(ctx).pipe(Effect.provide(fullCtx as Context.Context<any>));

      const isRoot = !options?.parentProcessId;

      // Trace invocation start for root processes (no parent).
      let invocationTrace: TracingService.InvocationTraceData | undefined;
      if (isRoot) {
        invocationTrace = yield* this.#tracingService.traceInvocationStart({
          payload: { data: { processId: id } },
        });
        this.#traceContexts.set(id, { ...traceContext, currentInvocation: invocationTrace });
      }

      const onFinished = (state: Process.State, cause?: Cause.Cause<never>): Effect.Effect<void> =>
        Effect.gen(this, function* () {
          log.info('onFinished', { pid: handle.pid });
          if (handle.parentId !== null) {
            const parentHandle = this.#handles.get(handle.parentId);
            if (parentHandle) {
              log.info('requesting child event', { pid: handle.parentId });
              parentHandle.requestChildEvent({
                _tag: 'exited',
                pid: handle.pid,
                result: cause ? Exit.failCause(cause) : Exit.succeed(undefined),
              });
            } else {
              log.warn('parent handle not found', { pid: handle.parentId });
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
        process,
        scope,
        fullCtx,
        this.#registry,
        outputQueue,
        storage,
        executable.key,
        executable.name ?? null,
        params,
        onFinished,
        () => this.#refreshProcessTree(),
        () => this.#hasNonTerminalChildren(id),
      );
      handleRef = handle;
      this.#handles.set(id, handle);
      this.#refreshProcessTree();

      yield* handle.runOnSpawn();

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
        return yield* Effect.die(new Error(`Process not found: ${id}`));
      }
      return handle as unknown as Handle<I, O>;
    });
  }

  list(options?: ListOptions): Effect.Effect<readonly Handle.Any[]> {
    return Effect.sync(() => {
      let impls: ProcessHandleImpl<any, any, any>[] = [...this.#handles.values()];
      if (options?.executableKey !== undefined) {
        impls = impls.filter((handle) => handle.executableKey === options.executableKey);
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
> =>
  Layer.scopedContext(
    Effect.gen(function* () {
      const kvStore = yield* KeyValueStore.KeyValueStore;
      const serviceResolver = yield* ServiceResolver.ServiceResolver;
      const tracingService = yield* TracingService;

      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const registry = yield* Registry.AtomRegistry;

      const manager = new ProcessManagerImpl({
        registry,
        kvStore,
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
