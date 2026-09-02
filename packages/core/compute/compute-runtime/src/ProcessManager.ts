//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';
import * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcTest from 'effect/unstable/rpc/RpcTest';

import * as Cancellation from '@dxos/compute/Cancellation';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as StorageService from '@dxos/compute/StorageService';
import * as Trace from '@dxos/compute/Trace';
import { Annotation } from '@dxos/echo';
import { EffectEx, SpanAttributes } from '@dxos/effect';
import type { SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ProcessIdGenerator, UUIDProcessIdGenerator } from './process-id';
import { ProcessManagerService } from './process-manager-service';
import { type PersistedProcess, ProcessStore } from './process-store';
import { createProcessTraceService } from './process-trace';
import * as ProcessHandle from './ProcessHandle';
import * as ProcessOperationInvoker from './ProcessOperationInvoker';
import { layer as storageServiceLayer } from './storage-service-layer';

export {
  type ProcessIdGenerator,
  SequentialProcessIdGenerator as SequentialIdGenerator,
  SequentialProcessIdGenerator,
  UUIDProcessIdGenerator,
} from './process-id';

export { ProcessOperationInvoker };

/**
 * Builds the in-memory loopback RPC client for a process's declared control surface.
 * The control plane is untyped at runtime (`RpcGroup`/`RpcClient` carry `any`; see design spec §4.4),
 * so `definition.rpcs` and `rpcHandlers` introduce `any` into `makeClient`'s requirement set. Providing
 * the handler context and scope here discharges them, pinning the residual to `never` for callers.
 */
const makeLoopbackRpcClient = (
  rpcs: RpcGroup.RpcGroup<any>,
  rpcHandlers: Context.Context<any>,
  scope: Scope.Scope,
): Effect.Effect<RpcClient.RpcClient<any>> =>
  RpcTest.makeClient(rpcs).pipe(Effect.provide(rpcHandlers), Effect.provideService(Scope.Scope, scope));

/**
 * Shared no-op RPC client for handles that expose no live RPC surface (e.g. dormant persisted handles).
 * Built from an empty group, so it serves no requests; the dedicated scope is never closed. The client
 * is widened to the untyped `RpcClient<any>` surface stored on handles (`RpcClient` is invariant in its
 * group, so a `RpcClient<never>` is not otherwise assignable; see design spec §4.4).
 */
const EMPTY_RPC_CLIENT: RpcClient.RpcClient<any> = Effect.runSync(
  // `RpcGroup`/`RpcClient` are invariant in their group; the empty group is widened to the untyped
  // `any` surface so the resulting client matches `Handle.rpc` (see design spec §4.4).
  makeLoopbackRpcClient(
    RpcGroup.make() as unknown as RpcGroup.RpcGroup<any>,
    Context.empty() as Context.Context<any>,
    Effect.runSync(Scope.make()),
  ),
);

export interface Status {
  readonly state: Process.State;
  readonly exit: Option.Option<Exit.Exit<void>>;

  readonly startedAt: Date;
  readonly completedAt: Option.Option<Date>;
}

export interface Handle<_Input, _Output, _Rpcs extends Rpc.Any> {
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
   * What the process is running on behalf of. See {@link Process.Environment}.
   */
  readonly environment: Process.Environment;

  submitInput(input: _Input): Effect.Effect<void>;
  subscribeOutputs(): Stream.Stream<_Output>;

  /**
   * Subscribe to ephemeral trace messages for this process.
   * Replays buffered events, then streams new ones as they arrive.
   * The stream completes when the process reaches a terminal state.
   *
   * When consuming this stream from a short-lived parent effect (e.g. React
   * `useEffect` that `runPromise(Effect.forEach(subscribe))` and returns), fork
   * the collector with {@link Effect.forkDetach}, not {@link Effect.forkChild} — the
   * parent scope closes as soon as `forEach` finishes and interrupts scoped forks
   * before live `pushEphemeral` events arrive. Interrupt the daemon fiber explicitly
   * on dispose (see {@link ProcessOperationInvoker.fiberFromProcess}).
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
   * Resolves when the process settles its current foreground turn: {@link Process.State.IDLE} or
   * {@link Process.State.SUCCEEDED}, or {@link Process.State.HYBERNATING} with no pending alarm
   * (i.e. only background children remain in flight).
   *
   * Unlike {@link runToCompletion}, this does NOT wait for background children (e.g. delegated
   * sub-agents) to finish — so a supervisor's chat turn returns as soon as its reply is complete,
   * while sub-agents continue running and report back out of band. Still waits through
   * alarm-pending hybernation (more queued turn work). Defects on {@link Process.State.FAILED}.
   */
  runUntilSettled(): Effect.Effect<void>;

  /**
   * Submits each input in order, then streams outputs until the process reaches {@link Process.State.IDLE}
   * or {@link Process.State.SUCCEEDED}. While {@link Process.State.HYBERNATING}, keeps waiting for outputs
   * or a terminal state. The stream fails with a defect if the process reaches {@link Process.State.FAILED}
   * or {@link Process.State.TERMINATED}.
   */
  runAndExit(options: { readonly inputs: readonly _Input[] }): Stream.Stream<_Output>;

  /**
   * Hydrates a dormant persisted process using the supplied definition.
   * No-op when the handle is already live (returns self).
   */
  hydrate(definition: Process.Process<_Input, _Output, any, any>): Effect.Effect<Handle<_Input, _Output, _Rpcs>>;

  readonly rpc: RpcClient.RpcClient<_Rpcs>;
}

export namespace Handle {
  // Widened to `any` Rpcs so the implemented `rpc: RpcClient<any>` is assignable
  // regardless of a handle's concrete RPC group (variance, see design spec §4.4).
  export type Any = Handle<any, any, any>;
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
   * Ergonomic shorthand folded into {@link Process.TargetAnnotation} on the process annotations.
   */
  // TODO(dmaretskyi): Consider opaques metadata instead of opinionated `target` field.
  readonly target?: URI.URI;

  /**
   * Tracing metadata for this invocation.
   */
  readonly traceMeta?: Trace.Meta;

  readonly environment?: Process.Environment;

  /**
   * User-facing notifications requested for this process's lifecycle phases.
   * Ergonomic shorthand folded into {@link Process.NotifyAnnotation} on the process annotations.
   */
  readonly notify?: Operation.NotifyOptions;

  /**
   * User-defined annotations to attach to the process.
   * Caller-supplied entries are merged over the {@link target}/{@link notify} shorthands.
   */
  readonly annotations?: Annotation.Dictionary;
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
  readonly target?: URI.URI;
}

const matchesListOptions = (
  fields: {
    readonly key: string;
    readonly parentId: Process.ID | null;
    readonly state: Process.State;
    readonly annotations: Annotation.Dictionary;
  },
  options?: ListOptions,
): boolean => {
  if (options?.key !== undefined && fields.key !== options.key) {
    return false;
  }
  if (options?.parentProcessId !== undefined && fields.parentId !== options.parentProcessId) {
    return false;
  }
  if (options?.state !== undefined && fields.state !== options.state) {
    return false;
  }
  if (options?.target !== undefined) {
    const target = Annotation.getDictionary(fields.annotations, Process.TargetAnnotation);
    if (Option.getOrUndefined(target) !== options.target) {
      return false;
    }
  }
  return true;
};

/**
 * API for managing processes.
 */
export interface Manager {
  /**
   * Spawn a new process from a process definition.
   */
  spawn<I, O, Rpcs extends Rpc.Any = never>(
    definition: Process.Process<I, O, any, Rpcs>,
    options?: SpawnOptions,
  ): Effect.Effect<Handle<I, O, Rpcs>>;

  /**
   * Attach to an existing process.
   */
  attach<I, O, Rpcs extends Rpc.Any = never>(id: Process.ID): Effect.Effect<Handle<I, O, Rpcs>>;

  /**
   * Lists live processes and, when no live match exists, non-terminal processes
   * persisted in durable storage. Dormant entries expose {@link Handle.pid} and
   * metadata but require {@link Handle.hydrate} before inputs can be submitted.
   */
  list(options?: ListOptions): Effect.Effect<readonly Handle.Any[]>;

  runAllProcessesToCompletion(): Effect.Effect<void>;

  /**
   * Suspends all live processes, clears in-memory handle state, and persists durable records to KV.
   * Mimics app teardown. Idempotent — safe to call multiple times before {@link startup}.
   * Live processes must be rehydrated externally via {@link Handle.hydrate} after {@link startup}.
   */
  shutdown(): Effect.Effect<void>;

  /**
   * Marks the manager as ready after {@link shutdown}, mimicking a fresh boot from KV storage.
   * Does not rehydrate processes — callers supply definitions via {@link Handle.hydrate}.
   */
  startup(): Effect.Effect<void>;

  /**
   * Operation handlers supplied at construction (same set used for nested {@link Operation.Service} in processes).
   */
  readonly operationHandlerSet: OperationHandlerSet.OperationHandlerSet;

  /**
   * Local (this-runtime) process-tree view. The aggregate
   * {@link Process.ProcessMonitorService} is assembled from this plus the
   * remote view by {@link ProcessMonitor.layer}.
   */
  readonly monitor: Process.Monitor;
}

export { ProcessManagerService };
export { ProcessManagerService as Service };

export interface ProcessManagerImplOpts {
  registry: Registry.AtomRegistry;
  kvStore: KeyValueStore.KeyValueStore;
  traceSink: Trace.Sink;
  serviceResolver?: ServiceResolver.ServiceResolver;
  handlerSet?: OperationHandlerSet.OperationHandlerSet;
  idGenerator?: ProcessIdGenerator;

  /**
   * Runtime name to stamp on trace messages emitted by processes spawned by this manager.
   * Identifies which runtime (local app, edge intrinsic, edge worker, ...) executed the code.
   * Per-spawn `SpawnOptions.traceMeta.runtimeName` takes precedence over this default.
   */
  runtimeName?: Trace.RuntimeName;
}

export class ProcessManagerImpl implements Manager {
  readonly #idGenerator: ProcessIdGenerator;
  readonly #handles = new Map<Process.ID, ProcessHandle.ProcessHandleImpl<any, any, any>>();
  readonly #registry: Registry.AtomRegistry;
  readonly #kvStore: KeyValueStore.KeyValueStore;
  readonly #serviceResolver: ServiceResolver.ServiceResolver;
  readonly #handlerSet: OperationHandlerSet.OperationHandlerSet | undefined;
  readonly #traceSink: Trace.Sink;
  readonly #runtimeName: Trace.RuntimeName | undefined;
  readonly #store: ProcessStore;

  readonly #processTreeAtom: Atom.Writable<readonly Process.Info[]>;
  readonly #monitor: Process.Monitor;
  /**
   * Manager-level ephemeral trace hub (DX-1125). Every process's ephemeral messages are fanned out
   * here so {@link Process.Monitor.subscribeToTraceMessages} can stream them (filtered) without
   * attaching to individual handles.
   */
  readonly #traceSubscribers: Queue.Queue<Trace.Message>[] = [];
  readonly #lifecycleSemaphore = Effect.runSync(Semaphore.make(1));
  #shutDown = false;

  constructor(opts: ProcessManagerImplOpts) {
    this.#idGenerator = opts.idGenerator ?? UUIDProcessIdGenerator;
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
    this.#serviceResolver = opts.serviceResolver ?? ServiceResolver.empty;
    this.#handlerSet = opts.handlerSet;
    this.#traceSink = opts.traceSink;
    this.#runtimeName = opts.runtimeName;
    this.#store = new ProcessStore(opts.kvStore);
    this.#processTreeAtom = Atom.make<readonly Process.Info[]>([]);
    this.#registry.mount(this.#processTreeAtom);
    this.#monitor = {
      processTree: Effect.sync(() => this.#registry.get(this.#processTreeAtom)),
      processTreeAtom: this.#processTreeAtom,
      subscribeToTraceMessages: (filter: Trace.Filter): Stream.Stream<Trace.Message> =>
        Stream.unwrap(
          Effect.gen({ self: this }, function* () {
            const queue = yield* Effect.acquireRelease(Queue.unbounded<Trace.Message>(), (queue) =>
              Effect.sync(() => {
                const index = this.#traceSubscribers.indexOf(queue);
                if (index !== -1) {
                  this.#traceSubscribers.splice(index, 1);
                }
              }).pipe(Effect.andThen(Queue.shutdown(queue))),
            );
            this.#traceSubscribers.push(queue);
            return Stream.fromQueue(queue).pipe(
              Stream.filter((message) => message.isEphemeral && Trace.matchesFilter(message, filter)),
            );
          }),
        ),
    };
  }

  /**
   * Fan an ephemeral trace message out to all local trace subscribers (DX-1125).
   */
  #pushEphemeralToHub(message: Trace.Message): void {
    for (const queue of this.#traceSubscribers) {
      Queue.offerUnsafe(queue, message);
    }
  }

  get monitor(): Process.Monitor {
    return this.#monitor;
  }

  get operationHandlerSet(): OperationHandlerSet.OperationHandlerSet {
    return this.#handlerSet ?? OperationHandlerSet.empty;
  }

  #hasNonTerminalChildren(parentPid: Process.ID): boolean {
    for (const handle of this.#handles.values()) {
      if (handle.parentId === parentPid && ProcessManagerImpl.#isNonTerminal(handle)) {
        return true;
      }
    }
    return false;
  }

  #terminateChildren(parentPid: Process.ID): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const children = [...this.#handles.values()].filter(
        (handle) => handle.parentId === parentPid && ProcessManagerImpl.#isNonTerminal(handle),
      );
      for (const child of children) {
        log('lifecycle: terminate child', { parentPid, childPid: child.pid });
        yield* child.terminate();
      }
    });
  }

  static #isNonTerminal(handle: ProcessHandle.ProcessHandleImpl<any, any, any>): boolean {
    const { state } = handle.snapshotStatus();
    return state !== Process.State.SUCCEEDED && state !== Process.State.FAILED && state !== Process.State.TERMINATED;
  }

  #buildProcessTreeSnapshot(): readonly Process.Info[] {
    return [...this.#handles.values()].map((handle) => handle.snapshotProcessInfo());
  }

  #refreshProcessTree(): void {
    this.#registry.set(this.#processTreeAtom, this.#buildProcessTreeSnapshot());
  }

  /**
   * Suspends every live process handle and drops all in-memory manager state.
   * Durable records remain in KV for external {@link Handle.hydrate} after {@link startup}.
   */
  shutdown(): Effect.Effect<void> {
    return this.#lifecycleSemaphore.withPermits(1)(
      Effect.gen({ self: this }, function* () {
        if (this.#shutDown) {
          log('lifecycle: manager shutdown skipped (already shut down)');
          return;
        }
        const handleCount = this.#handles.size;
        if (handleCount > 0) {
          log('lifecycle: manager suspending', { handleCount, pids: [...this.#handles.keys()] });
          for (const handle of this.#handles.values()) {
            yield* handle.suspend();
          }
        }
        this.#handles.clear();
        this.#shutDown = true;
        this.#refreshProcessTree();
        log('lifecycle: manager suspended', { suspended: handleCount });
      }),
    );
  }

  startup(): Effect.Effect<void> {
    return this.#lifecycleSemaphore.withPermits(1)(
      Effect.sync(() => {
        if (!this.#shutDown) {
          log('lifecycle: manager startup skipped (not shut down)');
          return;
        }
        this.#shutDown = false;
        this.#refreshProcessTree();
        log('lifecycle: manager started');
      }),
    );
  }

  spawn<I, O, _Rpcs extends Rpc.Any>(
    definition: Process.Process<I, O, any, _Rpcs>,
    options?: SpawnOptions,
  ): Effect.Effect<Handle<I, O, _Rpcs>> {
    return Effect.gen({ self: this }, function* () {
      // Captured from the ambient runtime so alarms are driven by the same `Clock` (incl. `TestClock`).
      const id = this.#idGenerator();
      log('lifecycle: spawn', {
        pid: id,
        key: definition.key,
        parentPid: options?.parentProcessId,
        name: options?.name,
      });
      const scope = yield* Scope.make();
      const dispatchContext = yield* EffectEx.contextWithoutParentSpan();
      const outputQueue = yield* Queue.unbounded<ProcessHandle.OutputItem<O>>();

      const storage = storageServiceLayer(this.#kvStore, `process/${id}/`);

      const parentOption = Option.fromNullishOr(options?.parentProcessId);

      const parentHandle =
        options?.parentProcessId !== undefined ? this.#handles.get(options.parentProcessId) : undefined;
      const environment: Process.Environment = {
        ...(parentHandle !== undefined ? parentHandle.environment : {}),
        ...options?.environment,
      };

      const resolutionContext: LayerSpec.LayerContext = {
        space: environment.space,
        conversation: environment.conversation,
        process: id,
      };

      let handleRef: ProcessHandle.ProcessHandleImpl<I, O, any> | null = null;

      const annotations = Annotation.buildDictionary((dictionary) => {
        if (options?.target != null) {
          Annotation.setDictionary(dictionary, Process.TargetAnnotation, options.target);
        }
        if (options?.notify != null) {
          Annotation.setDictionary(dictionary, Process.NotifyAnnotation, options.notify);
        }
        if (options?.annotations) {
          Object.assign(dictionary, options.annotations);
        }
      });
      const params: Process.Params = {
        name: options?.name ?? null,
        annotations,
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
        setAlarm: (timeout?: number) => handleRef?.requestAlarm(timeout) ?? Effect.void,
      };

      // One controller per run, fired by {@link ProcessHandle.ProcessHandleImpl.terminate} — the
      // local counterpart of the EDGE-provided Cancellation service.
      const cancellation = new AbortController();
      let builtinCtx = Context.empty().pipe(
        Context.add(StorageService.StorageService, storage),
        Context.add(Scope.Scope, scope),
        Context.add(Cancellation.Service, { signal: cancellation.signal }),
        Context.add(
          Trace.TraceService,
          createProcessTraceService({
            pid: id,
            parentPid: options?.parentProcessId,
            processName: params.name ?? undefined,
            traceMeta: options?.traceMeta,
            runtimeName: this.#runtimeName,
            space: environment.space,
            sink: this.#traceSink,
            onEphemeral: (message) => {
              handleRef?.pushEphemeral(message);
              this.#pushEphemeralToHub(message);
            },
          }),
        ),
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
        StorageService.key,
        Scope.Scope.key,
        Trace.TraceService.key,
        Operation.Service.key,
        ProcessOperationInvoker.Service.key,
        Cancellation.Service.key,
      ]);
      const externalServices = definition.services.filter((tag: Context.Key<any, any>) => !builtinTagKeys.has(tag.key));

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
        Effect.gen({ self: this }, function* () {
          log('lifecycle: ended', { pid: handle.pid, state });
          if (handle.parentId !== null) {
            const parentHandle = this.#handles.get(handle.parentId);
            if (parentHandle) {
              log('lifecycle: notify parent', { parentPid: handle.parentId, childPid: handle.pid });
              yield* parentHandle.requestChildEvent({
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
        });

      // Persistence adapter bound to this process id.
      const persistence = {
        setAlarm: (dueAt: number | null) => this.#store.setAlarm(id, dueAt),
        setState: (state: Process.State) => this.#store.setState(id, state),
        removeEvent: (seq: number) => this.#store.removeEvent(id, seq),
        appendEvent: (event: import('./process-store').PersistedEventInput) => this.#store.appendEvent(id, event),
        deleteRecord: () => this.#store.deleteProcess(id),
      };

      // Process.make spreads opts into the definition object at runtime; cast is safe at this boundary.
      const defRaw = definition as unknown as { input: Schema.Codec<I, any, never> };
      // Fall back to null rather than crashing if the input cannot be persisted. The durable
      // store JSON-serializes this value, and a successful schema encode does not guarantee
      // JSON-safety (e.g. Schema.Any passes a live reference straight through), so round-trip
      // through JSON and degrade to null when it is not serializable. The handler still receives
      // the original typed value; re-delivery after restart sees null — best-effort by design.
      const encodeInput = (input: I): Effect.Effect<unknown> =>
        Schema.encodeEffect(defRaw.input)(input).pipe(
          Effect.flatMap((encoded) => Effect.try((): unknown => JSON.parse(JSON.stringify(encoded)))),
          Effect.orElseSucceed(() => null),
        );

      // In-memory RPC control plane: a no-serialization client/server pair bound to the
      // process scope, dispatching to the handlers the process declared via `create()`.
      const rpcClient = yield* makeLoopbackRpcClient(definition.rpcs, callbacks.rpcHandlers, scope);

      const handle = new ProcessHandle.ProcessHandleImpl<I, O, any>(
        id,
        Option.getOrNull(parentOption),
        callbacks,
        scope,
        fullCtx,
        dispatchContext,
        this.#registry,
        outputQueue,
        storage,
        definition.key,
        params,
        environment,
        this.#traceSink,
        rpcClient,
        onFinished,
        () => this.#refreshProcessTree(),
        () => this.#hasNonTerminalChildren(id),
        () => this.#terminateChildren(id),
        persistence,
        false,
        encodeInput,
        undefined,
        cancellation,
      );
      handleRef = handle;
      this.#handles.set(id, handle);
      this.#refreshProcessTree();

      // Write initial durable record before running onSpawn.
      yield* this.#store.putProcess({
        id,
        key: definition.key,
        params: { name: params.name ?? null, annotations: params.annotations },
        environment: { space: environment.space, conversation: environment.conversation },
        parentId: Option.getOrNull(parentOption),
        state: Process.State.RUNNING,
        alarmDueAt: null,
        events: [],
      });

      // Append spawn event; seq is passed to runOnSpawn so it's removed when the handler settles.
      const spawnSeq = yield* this.#store.appendEvent(id, { _tag: 'spawn' });
      yield* handle.runOnSpawn(spawnSeq);
      log('lifecycle: started', { pid: id, key: definition.key });

      // Runtime→public boundary: the live handle stores its RPC client untyped (`RpcClient<any>`),
      // while the public surface is the precise `Handle<I, O, _Rpcs>`. `RpcClient` is invariant, so
      // bridging the two requires a cast here (see design spec §4.4).
      return handle as unknown as Handle<I, O, _Rpcs>;
    }).pipe(Effect.withSpan('ProcessManager.spawn', { attributes: { [SpanAttributes.PROCESS.key]: definition.key } }));
  }

  /**
   * Re-hydrates a persisted process record into a live handle without running onSpawn.
   */
  #rehydrate(
    record: PersistedProcess,
    definition: Process.Process<any, any, any, any>,
  ): Effect.Effect<ProcessHandle.ProcessHandleImpl<any, any, any>> {
    return Effect.gen({ self: this }, function* () {
      // Captured from the ambient runtime so alarms are driven by the same `Clock` (incl. `TestClock`).
      const id = record.id;
      log('lifecycle: rehydrate', { pid: id, key: record.key });

      const scope = yield* Scope.make();
      const dispatchContext = yield* EffectEx.contextWithoutParentSpan();
      const outputQueue = yield* Queue.unbounded<ProcessHandle.OutputItem<any>>();
      const storage = storageServiceLayer(this.#kvStore, `process/${id}/`);

      const parentOption = Option.fromNullishOr(record.parentId);
      // Deserialization boundary: schema stores space/conversation as plain strings;
      // cast back to opaque branded types.
      const environment: Process.Environment = {
        space: record.environment.space as SpaceId | undefined,
        conversation: record.environment.conversation as URI.URI | undefined,
      };

      const resolutionContext: LayerSpec.LayerContext = {
        space: environment.space,
        conversation: environment.conversation,
        process: id,
      };

      let handleRef: ProcessHandle.ProcessHandleImpl<any, any, any> | null = null;

      const params: Process.Params = {
        name: record.params.name,
        annotations: record.params.annotations,
      };

      const ctx: Process.ProcessContext<any, any> = {
        id,
        params,
        succeed: () => {
          handleRef?.requestSucceed();
        },
        fail: (error: Error) => {
          handleRef?.requestFail(error);
        },
        submitOutput: (output: any) => {
          handleRef?.requestSubmitOutput(output);
        },
        setAlarm: (timeout?: number) => handleRef?.requestAlarm(timeout) ?? Effect.void,
      };

      const cancellation = new AbortController();
      let builtinCtx = Context.empty().pipe(
        Context.add(StorageService.StorageService, storage),
        Context.add(Scope.Scope, scope),
        Context.add(Cancellation.Service, { signal: cancellation.signal }),
        Context.add(
          Trace.TraceService,
          createProcessTraceService({
            pid: id,
            parentPid: record.parentId ?? undefined,
            processName: params.name ?? undefined,
            runtimeName: this.#runtimeName,
            space: environment.space,
            sink: this.#traceSink,
            onEphemeral: (message) => {
              handleRef?.pushEphemeral(message);
              this.#pushEphemeralToHub(message);
            },
          }),
        ),
      );

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
        StorageService.key,
        Scope.Scope.key,
        Trace.TraceService.key,
        Operation.Service.key,
        ProcessOperationInvoker.Service.key,
        Cancellation.Service.key,
      ]);
      const externalServices = definition.services.filter((tag: Context.Key<any, any>) => !builtinTagKeys.has(tag.key));

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
        Effect.gen({ self: this }, function* () {
          log('lifecycle: ended', { pid: handle.pid, state });
          if (handle.parentId !== null) {
            const parentHandle = this.#handles.get(handle.parentId);
            if (parentHandle) {
              log('lifecycle: notify parent', { parentPid: handle.parentId, childPid: handle.pid });
              yield* parentHandle.requestChildEvent({
                _tag: 'exited',
                pid: handle.pid,
                result: cause ? Exit.failCause(cause) : Exit.succeed(undefined),
              });
            }
          }
        });

      const persistence = {
        setAlarm: (dueAt: number | null) => this.#store.setAlarm(id, dueAt),
        setState: (state: Process.State) => this.#store.setState(id, state),
        removeEvent: (seq: number) => this.#store.removeEvent(id, seq),
        appendEvent: (event: import('./process-store').PersistedEventInput) => this.#store.appendEvent(id, event),
        deleteRecord: () => this.#store.deleteProcess(id),
      };

      // Process.make spreads opts into the definition object at runtime; cast is safe at this boundary.
      const defRaw = definition as unknown as { input: Schema.Codec<any, any, never> };
      const encodeInput = (input: any): Effect.Effect<unknown> =>
        Schema.encodeEffect(defRaw.input)(input).pipe(Effect.orDie);

      const rpcClient = yield* makeLoopbackRpcClient(definition.rpcs, callbacks.rpcHandlers, scope);

      const handle = new ProcessHandle.ProcessHandleImpl<any, any, any>(
        id,
        Option.getOrNull(parentOption),
        callbacks,
        scope,
        fullCtx,
        dispatchContext,
        this.#registry,
        outputQueue,
        storage,
        definition.key,
        params,
        environment,
        this.#traceSink,
        rpcClient,
        onFinished,
        () => this.#refreshProcessTree(),
        () => this.#hasNonTerminalChildren(id),
        () => this.#terminateChildren(id),
        persistence,
        true, // restoring — suppresses onSpawn
        encodeInput,
        record.state, // hydrate the persisted state instead of defaulting to RUNNING
        cancellation,
      );
      handleRef = handle;
      this.#handles.set(id, handle);
      this.#refreshProcessTree();

      // Re-arm a still-pending alarm.
      if (record.alarmDueAt !== null) {
        yield* handle.rearmAlarm(record.alarmDueAt);
      }

      // Re-deliver events that never settled (interrupted by shutdown), in seq order.
      // Forked so hydrate returns immediately; handlers run on the process scope like normal inputs.
      const pendingEvents = [...record.events].sort((a, b) => a.seq - b.seq);
      if (pendingEvents.length > 0) {
        log('lifecycle: redeliver pending events', { pid: id, count: pendingEvents.length });
        yield* Effect.forkIn(
          Effect.forEach(pendingEvents, (event) => handle.redeliver(event, definition), { discard: true }),
          scope,
        );
      }

      return handle;
    }).pipe(Effect.withSpan('ProcessManager.shutdown'));
  }

  #hydrateFromDefinition<I, O, Rpcs extends Rpc.Any = never>(
    id: Process.ID,
    definition: Process.Process<I, O, any, any>,
  ): Effect.Effect<Handle<I, O, Rpcs>> {
    return Effect.gen({ self: this }, function* () {
      const existing = this.#handles.get(id);
      if (existing) {
        log('lifecycle: hydrate skipped (already live)', { pid: id });
        return existing as unknown as Handle<I, O, Rpcs>;
      }

      const record = yield* this.#store.getProcess(id);
      if (record === undefined) {
        return yield* Effect.die(new Error(`No persisted process record: ${id}`));
      }

      if (record.key !== definition.key) {
        return yield* Effect.die(
          new Error(`Process definition key mismatch for ${id}: expected "${record.key}", got "${definition.key}"`),
        );
      }

      if (
        record.state === Process.State.SUCCEEDED ||
        record.state === Process.State.FAILED ||
        record.state === Process.State.TERMINATED
      ) {
        yield* this.#store.deleteProcess(id);
        return yield* Effect.die(new Error(`Cannot hydrate terminal process: ${id}`));
      }

      log('lifecycle: hydrate', { pid: id, key: record.key });
      const handle = yield* this.#rehydrate(record, definition);
      return handle as unknown as Handle<I, O, Rpcs>;
    }).pipe(
      Effect.withSpan('ProcessManager.hydrate', {
        attributes: { [SpanAttributes.PROCESS.id]: id, [SpanAttributes.PROCESS.key]: definition.key },
      }),
    );
  }

  /**
   * Terminates a persisted process that is not live by deleting its record (and those of its
   * dormant descendants), so a caller can discard it without hydrating it first.
   */
  #discardRecord(id: Process.ID): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      // Read before anything is torn down: `terminate` deletes records, and a live termination only
      // walks children in `#handles` — a process hydrated between the listing and this call would
      // otherwise leave its still-dormant descendants in storage to be rediscovered later.
      log('lifecycle: discard record', { pid: id });
      const persisted = yield* this.#store.listProcesses();
      const doomed = new Set<Process.ID>([id]);
      // Records carry no child index, so walk the flat list until it stops growing.
      for (let added = true; added;) {
        added = false;
        for (const record of persisted) {
          if (record.parentId !== null && doomed.has(record.parentId) && !doomed.has(record.id)) {
            doomed.add(record.id);
            added = true;
          }
        }
      }

      for (const pid of doomed) {
        const child = this.#handles.get(pid);
        if (child) {
          yield* child.terminate();
        } else {
          yield* this.#store.deleteProcess(pid);
        }
      }
    }).pipe(Effect.withSpan('ProcessManager.startup'));
  }

  attach<I, O, Rpcs extends Rpc.Any = never>(id: Process.ID): Effect.Effect<Handle<I, O, Rpcs>> {
    return Effect.gen({ self: this }, function* () {
      const handle = this.#handles.get(id);
      if (!handle) {
        log('lifecycle: attach failed (not found)', { pid: id });
        return yield* Effect.die(new Error(`Process not found: ${id}`));
      }
      log('lifecycle: attached', { key: handle.key, state: handle.snapshotStatus().state });
      return handle as unknown as Handle<I, O, Rpcs>;
    });
  }

  list(options?: ListOptions): Effect.Effect<readonly Handle.Any[]> {
    return Effect.gen({ self: this }, function* () {
      const results: Handle.Any[] = [];
      const seenIds = new Set<Process.ID>();

      for (const handle of this.#handles.values()) {
        if (
          !matchesListOptions(
            {
              key: handle.key,
              parentId: handle.parentId,
              state: handle.snapshotStatus().state,
              annotations: handle.params.annotations,
            },
            options,
          )
        ) {
          continue;
        }
        results.push(handle);
        seenIds.add(handle.pid);
      }

      const persisted = yield* this.#store.listProcesses();
      for (const record of persisted) {
        if (seenIds.has(record.id)) {
          continue;
        }
        if (
          record.state === Process.State.SUCCEEDED ||
          record.state === Process.State.FAILED ||
          record.state === Process.State.TERMINATED
        ) {
          continue;
        }
        if (
          !matchesListOptions(
            {
              key: record.key,
              parentId: record.parentId,
              state: record.state,
              annotations: record.params.annotations,
            },
            options,
          )
        ) {
          continue;
        }
        results.push(
          new DormantHandle(
            record,
            (definition) => this.#hydrateFromDefinition<unknown, unknown, any>(record.id, definition),
            () => this.#discardRecord(record.id),
          ),
        );
      }

      return results;
    });
  }

  runAllProcessesToCompletion(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const handles = [...this.#handles.values()];
      log('lifecycle: await all processes', { count: handles.length });
      yield* Effect.forEach(handles, (handle) => handle.runToCompletion(), {
        concurrency: 'unbounded',
        discard: true,
      });
    });
  }
}

/**
 * Read-only handle view of a persisted process that is not currently live.
 * Returned by {@link ProcessManagerImpl.list} until {@link Handle.hydrate} is called.
 */
class DormantHandle<I, O> implements Handle<I, O, any> {
  readonly pid: Process.ID;
  readonly parentId: Process.ID | null;
  readonly key: string;
  readonly params: Process.Params;
  readonly environment: Process.Environment;
  readonly status: Status;
  readonly statusAtom: Atom.Atom<Status>;
  // Dormant handles expose no live RPC surface; the empty client serves no requests. Stored untyped
  // (`RpcClient<any>`) so the dormant handle is assignable to `Handle.Any` (see design spec §4.4).
  readonly rpc: RpcClient.RpcClient<any> = EMPTY_RPC_CLIENT;
  readonly #rehydrate: (definition: Process.Process<I, O, any, any>) => Effect.Effect<Handle<I, O, any>>;
  readonly #discard: () => Effect.Effect<void>;

  constructor(
    record: PersistedProcess,
    rehydrate: (definition: Process.Process<I, O, any, any>) => Effect.Effect<Handle<I, O, any>>,
    discard: () => Effect.Effect<void>,
  ) {
    this.#rehydrate = rehydrate;
    this.#discard = discard;
    this.pid = record.id;
    this.parentId = record.parentId;
    this.key = record.key;
    this.params = {
      name: record.params.name,
      annotations: record.params.annotations,
    };
    this.environment = {
      space: record.environment.space as SpaceId | undefined,
      conversation: record.environment.conversation as URI.URI | undefined,
    };
    this.status = {
      state: record.state,
      exit: Option.none(),
      startedAt: new Date(0),
      completedAt: Option.none(),
    };
    this.statusAtom = Atom.make(this.status);
  }

  hydrate = (definition: Process.Process<I, O, any, any>): Effect.Effect<Handle<I, O, any>> =>
    this.#rehydrate(definition);

  submitInput = (): Effect.Effect<void> => Effect.die(new Error('Process not hydrated'));

  subscribeOutputs = (): Stream.Stream<O> => Stream.die(new Error('Process not hydrated'));

  subscribeEphemeral = (): Stream.Stream<Trace.Message> => Stream.die(new Error('Process not hydrated'));

  // Terminating without hydrating is the point: a caller discarding a stale process (e.g. one whose
  // immutable spawn annotations no longer match) must not have to boot it first just to kill it.
  terminate = (): Effect.Effect<void> => this.#discard();

  runToCompletion = (): Effect.Effect<void> => Effect.die(new Error('Process not hydrated'));

  runUntilSettled = (): Effect.Effect<void> => Effect.die(new Error('Process not hydrated'));

  runAndExit = (): Stream.Stream<O> => Stream.die(new Error('Process not hydrated'));
}

/**
 * Scoped layer that provides {@link ProcessManagerService}.
 * On scope close, the manager's `shutdown()` runs (layer finalizer), suspending
 * process state so it can be hydrated on the next boot.
 *
 * The {@link Process.ProcessMonitorService} is provided separately by the
 * aggregate {@link ProcessMonitor.layer}, which merges this local manager's
 * `monitor` with the remote ({@link RemoteProcessManager.Service}) one.
 *
 * Requires KeyValueStore, ServiceResolver, OperationHandlerSet.OperationHandlerProvider,
 * and Registry.AtomRegistry from the environment.
 */
export const layer = (opts?: {
  idGenerator?: ProcessIdGenerator;
  /**
   * Runtime name stamped on every trace message emitted by processes spawned by this manager.
   * See {@link Trace.CommonRuntimeName} for well-known values.
   */
  runtimeName?: Trace.RuntimeName;
}): Layer.Layer<
  ProcessManagerService,
  never,
  | KeyValueStore.KeyValueStore
  | ServiceResolver.ServiceResolver
  | OperationHandlerSet.OperationHandlerProvider
  | Registry.AtomRegistry
  | Trace.TraceSink
> =>
  Layer.effectContext(
    Effect.gen(function* () {
      const kvStore = yield* KeyValueStore.KeyValueStore;
      const serviceResolver = yield* ServiceResolver.ServiceResolver;

      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const registry = yield* Registry.AtomRegistry;
      const traceSink = yield* Trace.TraceSink;

      const manager = new ProcessManagerImpl({
        registry,
        kvStore,
        traceSink,
        serviceResolver,
        handlerSet,
        idGenerator: opts?.idGenerator,
        runtimeName: opts?.runtimeName,
      });

      yield* Effect.addFinalizer(() => manager.shutdown());

      return Context.make(ProcessManagerService, manager);
    }),
  );
