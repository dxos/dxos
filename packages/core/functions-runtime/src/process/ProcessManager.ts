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
import * as Schema from 'effect/Schema';
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

export interface Status {
  readonly state: Process.State;
  readonly exit: Option.Option<Exit.Exit<void>>;

  readonly startedAt: Date;
  readonly completedAt: Option.Option<Date>;
}

export interface Handle<I, O> {
  readonly pid: Process.ID;
  readonly parentId: Option.Option<Process.ID>;

  submitInput(input: I): Effect.Effect<void>;
  subscribeOutputs(): Stream.Stream<O>;

  terminate(): Effect.Effect<void>;
  status(): Effect.Effect<Status>;
  statusAtom: Atom.Atom<Status>;

  /**
   * Runs the process until it goes into a SUSPENDED, TERMINATED, FAILED, or COMPLETED state.
   * I.e. it has completed all work with the currently submitted inputs.
   * If the process fails, this effect will throw a defect.
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
  spawn<I, O>(executable: Process.Executable<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>>;
  /**
   * Attach to an existing process.
   */
  attach<I, O>(id: Process.ID): Effect.Effect<Handle<I, O>>;

  /**
   * Attach to an existing process if it exists, otherwise spawn a new process for the executable.
   * `executable` and `options` are ignored if the process already exists.
   */
  ensure<I, O>(
    id: Process.ID,
    executable: Process.Executable<I, O, any>,
    options?: SpawnOptions,
  ): Effect.Effect<Handle<I, O>>;

  /**
   * List all spawned processes.
   */
  list(): Effect.Effect<readonly Handle.Any[]>;
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
  readonly parentId: Option.Option<Process.ID>;

  #currentStatus: Status;
  #activeHandlers = 0;
  #finished = false;
  #exitRequested = false;
  #failError: Error | null = null;
  #alarmTimer: ReturnType<typeof setTimeout> | null = null;
  #services: Context.Context<R | Process.BaseServices>;

  readonly #process: Process.Process<I, O, R>;
  readonly #scope: Scope.CloseableScope;
  readonly #registry: Registry.Registry;
  readonly #outputQueue: Queue.Queue<OutputItem<O>>;
  readonly #storage: Context.Tag.Service<typeof StorageService.StorageService>;

  readonly #onFinished: ((state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>) | undefined;

  constructor(
    readonly pid: Process.ID,
    parentId: Option.Option<Process.ID>,
    process: Process.Process<I, O, R>,
    scope: Scope.CloseableScope,
    services: Context.Context<R | Process.BaseServices>,
    registry: Registry.Registry,
    outputQueue: Queue.Queue<OutputItem<O>>,
    storage: Context.Tag.Service<typeof StorageService.StorageService>,
    onFinished?: (state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>,
  ) {
    this.parentId = parentId;
    this.#process = process;
    this.#scope = scope;
    this.#services = services;
    this.#registry = registry;
    this.#outputQueue = outputQueue;
    this.#storage = storage;
    this.#onFinished = onFinished;

    this.#currentStatus = {
      state: Process.State.RUNNING,
      exit: Option.none(),
      startedAt: new Date(),
      completedAt: Option.none(),
    };
    this.statusAtom = Atom.make<Status>(this.#currentStatus);
    this.#registry.mount(this.statusAtom);
  }

  /** Run process init. Called by ProcessManagerImpl after spawn. */
  runInit(): Effect.Effect<void> {
    return this.#runHandler(() => this.#process.init());
  }

  submitInput(input: I): Effect.Effect<void> {
    if (this.#finished) {
      return Effect.void;
    }
    return this.#runHandler(() => this.#process.handleInput(input));
  }

  subscribeOutputs(): Stream.Stream<O> {
    return Stream.fromQueue(this.#outputQueue).pipe(Stream.takeWhile(Option.isSome), Stream.map(Option.getOrThrow));
  }

  terminate(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
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
            case Process.State.COMPLETED:
            case Process.State.TERMINATED:
            case Process.State.SUSPENDED:
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

  requestExit(): void {
    this.#exitRequested = true;
  }

  requestFail(error: Error): void {
    this.#failError = error;
  }

  requestAlarm(timeout?: number): void {
    if (this.#finished) return;
    this.#clearAlarm();
    const delay = timeout ?? 0;
    this.#alarmTimer = setTimeout(() => {
      this.#alarmTimer = null;
      if (!this.#finished) {
        Effect.runFork(this.#runHandler(() => this.#process.alarm()));
      }
    }, delay);
  }

  requestSubmitOutput(output: O): void {
    Queue.unsafeOffer(this.#outputQueue, Option.some(output));
  }

  #runHandler(fn: () => Effect.Effect<void, never, R | Process.BaseServices>): Effect.Effect<void> {
    this.#activeHandlers++;
    this.#setStatus(Process.State.RUNNING);
    return fn().pipe(
      Effect.provide(this.#services),
      Effect.tap(() => this.#handlerCompleted()),
      Effect.catchAllCause((cause) => this.#handleError(cause)),
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

    if (this.#exitRequested && this.#activeHandlers === 0) {
      this.#finished = true;
      return this.#cleanup().pipe(
        Effect.tap(() => this.#setStatus(Process.State.COMPLETED, Exit.void)),
        Effect.tap(() => this.#onFinished?.(Process.State.COMPLETED) ?? Effect.void),
      );
    }

    if (this.#activeHandlers === 0) {
      this.#setStatus(Process.State.HYBERNATING);
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
    const isTerminal =
      state === Process.State.COMPLETED || state === Process.State.TERMINATED || state === Process.State.FAILED;
    this.#currentStatus = {
      state,
      exit: exit ? Option.some(exit) : Option.none(),
      startedAt: this.#currentStatus.startedAt,
      completedAt: isTerminal ? Option.some(new Date()) : Option.none(),
    };
    this.#registry.set(this.statusAtom, this.#currentStatus);
  }
}

export interface ProcessManagerImplOpts {
  registry: Registry.Registry;
  kvStore: KeyValueStore.KeyValueStore;
  serviceResolver?: ServiceResolver.ServiceResolver;
  tracingService?: Context.Tag.Service<TracingService>;
  handlerSet?: OperationHandlerSet.OperationHandlerSet;
}

export class ProcessManagerImpl implements Manager {
  readonly #handles = new Map<Process.ID, ProcessHandleImpl<any, any, any>>();
  readonly #traceContexts = new Map<Process.ID, TracingService.TraceContext>();
  readonly #registry: Registry.Registry;
  readonly #kvStore: KeyValueStore.KeyValueStore;
  readonly #serviceResolver: ServiceResolver.ServiceResolver;
  readonly #tracingService: Context.Tag.Service<TracingService>;
  readonly #handlerSet: OperationHandlerSet.OperationHandlerSet | undefined;

  constructor(opts: ProcessManagerImplOpts) {
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
    this.#serviceResolver = opts.serviceResolver ?? ServiceResolver.empty;
    this.#tracingService = opts.tracingService ?? TracingService.noop;
    this.#handlerSet = opts.handlerSet;
  }

  spawn<I, O>(executable: Process.Executable<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>> {
    return Effect.gen(this, function* () {
      const id = Schema.decodeSync(Process.ID)(crypto.randomUUID());
      const scope = yield* Scope.make();
      const outputQueue = yield* Queue.unbounded<OutputItem<O>>();

      const storage = StorageService.layer(this.#kvStore, `process/${id}/`);

      const parentOption = options?.parentProcessId ? Option.some(options.parentProcessId) : Option.none<Process.ID>();

      let handleRef: ProcessHandleImpl<I, O, any> | null = null;

      const ctx: Process.ProcessContext<I, O> = {
        id,
        exit: () => {
          handleRef?.requestExit();
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

      const process = yield* executable.run(ctx).pipe(Effect.provide(fullCtx as Context.Context<any>));

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
          // Call traceInvocationEnd for root processes.
          if (isRoot && invocationTrace) {
            const exception = state === Process.State.FAILED && cause ? cause : undefined;
            yield* this.#tracingService.traceInvocationEnd({ trace: invocationTrace, exception });
          }
          this.#traceContexts.delete(id);
        });

      const handle = new ProcessHandleImpl<I, O, any>(
        id,
        parentOption,
        process,
        scope,
        builtinCtx,
        this.#registry,
        outputQueue,
        storage,
        onFinished,
      );
      handleRef = handle;
      this.#handles.set(id, handle);

      yield* handle.runInit();

      return handle;
    });
  }

  ensure<I, O>(
    id: Process.ID,
    executable: Process.Executable<I, O, any>,
    options?: SpawnOptions,
  ): Effect.Effect<Handle<I, O>> {
    const process = this.#handles.get(id);
    if (process) {
      return Effect.succeed(process);
    }
    return this.spawn(executable, options);
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

  list(): Effect.Effect<readonly Handle.Any[]> {
    return Effect.sync(() => [...this.#handles.values()]);
  }
}

/**
 * Layer that provides ProcessManager backed by ProcessManagerImpl.
 * Requires KeyValueStore, ServiceResolver, TracingService, and OperationHandlerSet.OperationHandlerProvider from the environment.
 */
export const layer: Layer.Layer<
  ProcessManagerService,
  never,
  | KeyValueStore.KeyValueStore
  | ServiceResolver.ServiceResolver
  | TracingService
  | OperationHandlerSet.OperationHandlerProvider
> = Layer.effect(
  ProcessManagerService,
  Effect.gen(function* () {
    const kvStore = yield* KeyValueStore.KeyValueStore;
    const serviceResolver = yield* ServiceResolver.ServiceResolver;
    const tracingService = yield* TracingService;
    const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
    const registry = Registry.make();
    return new ProcessManagerImpl({
      registry,
      kvStore,
      serviceResolver,
      tracingService,
      handlerSet,
    });
  }),
);
