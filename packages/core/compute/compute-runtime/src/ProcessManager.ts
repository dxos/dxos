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
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Queue from 'effect/Queue';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcTest from 'effect/rpc/RpcTest';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';

import * as Cancellation from '@dxos/compute/Cancellation';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as StorageService from '@dxos/compute/StorageService';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Database } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as SpanAttributes from '@dxos/effect/SpanAttributes';
import type { SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { markWork } from '@dxos/util';

import { type ProcessIdGenerator, UUIDProcessIdGenerator } from './process-id.ts';
import { ProcessManagerService } from './process-manager-service.ts';
import { type PersistedProcess, ProcessStore } from './process-store.ts';
import { createProcessTraceService } from './process-trace.ts';
import * as ProcessHandle from './ProcessHandle.ts';
import * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';
import { layer as storageServiceLayer } from './storage-service-layer.ts';

/**
 * The origin a process's database writes are attributed to. A process serving a conversation is an agent's work,
 * not a person's, and its children inherit the conversation; any other process takes the origin it was spawned with.
 */
const resolveOrigin = (
  environment: Process.Environment,
  requested: Database.Origin | undefined,
): Database.Origin | undefined => (environment.conversation != null ? 'system' : requested);

const originContext = (origin: Database.Origin | undefined): Context.Context<never> =>
  origin !== undefined ? Context.make(Database.Origin, origin) : Context.empty();

export {
  type ProcessIdGenerator,
  SequentialProcessIdGenerator as SequentialIdGenerator,
  SequentialProcessIdGenerator,
  UUIDProcessIdGenerator,
} from './process-id.ts';

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

const FINISHED_PROCESS_RETENTION = 200;

/**
 * Shared no-op RPC client for handles that expose no live RPC surface (e.g. dormant persisted handles).
 * Built from an empty group, so it serves no requests; the dedicated scope is never closed. The client
 * is widened to the untyped `RpcClient<any>` surface stored on handles (`RpcClient` is invariant in its
 * group, so a `RpcClient<never>` is not otherwise assignable; see design spec §4.4).
 */
const EMPTY_RPC_CLIENT: RpcClient.RpcClient<any> = Effect.runSync(
  // `RpcGroup`/`RpcClient` are invariant in their group; the empty group is widened to the untyped
  // `any` surface so the resulting client matches `Process.Handle.rpc` (see design spec §4.4).
  makeLoopbackRpcClient(
    RpcGroup.make() as unknown as RpcGroup.RpcGroup<any>,
    Context.empty() as Context.Context<any>,
    Effect.runSync(Scope.make()),
  ),
);

const matchesListOptions = (
  fields: {
    readonly key: string;
    readonly parentId: Process.ID | null;
    readonly state: Process.State;
    readonly annotations: Annotation.Dictionary;
  },
  options?: Process.ListOptions,
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
    definition: Operation.Durable<I, O, any, Rpcs>,
    options?: Process.SpawnOptions,
  ): Effect.Effect<Process.Handle<I, O, Rpcs>>;

  /**
   * Attach to an existing process.
   */
  attach<I, O, Rpcs extends Rpc.Any = never>(id: Process.ID): Effect.Effect<Process.Handle<I, O, Rpcs>>;

  /**
   * Lists live processes and, when no live match exists, non-terminal processes
   * persisted in durable storage. Dormant entries expose {@link Process.Handle.pid} and
   * metadata but require {@link Process.Handle.hydrate} before inputs can be submitted.
   */
  list(options?: Process.ListOptions): Effect.Effect<readonly Process.Handle.Any[]>;

  runAllProcessesToCompletion(): Effect.Effect<void>;

  /**
   * Suspends all live processes, clears in-memory handle state, and persists durable records to KV.
   * Mimics app teardown. Idempotent — safe to call multiple times before {@link startup}.
   * Live processes must be rehydrated externally via {@link Process.Handle.hydrate} after {@link startup}.
   */
  shutdown(): Effect.Effect<void>;

  /**
   * Marks the manager as ready after {@link shutdown}, mimicking a fresh boot from KV storage.
   * Does not rehydrate processes — callers supply definitions via {@link Process.Handle.hydrate}.
   */
  startup(): Effect.Effect<void>;

  /**
   * Operation handlers supplied at construction (same set used for nested {@link Operation.Service} in processes).
   */
  readonly operationHandlerSet: OperationHandlerSet.OperationHandlerSet;

  /**
   * Local (this-runtime) process tree. The aggregate {@link Process.ManagerService} is assembled from
   * this plus the remote tree by {@link UnifiedProcessManager.layer}.
   */
  readonly processTreeAtom: Atom.Atom<readonly Process.Process[]>;

  /** Ephemeral trace messages from this runtime's processes matching `filter` (DX-1125). */
  subscribeToTraceMessages(filter: Trace.Filter): Stream.Stream<Trace.Message>;
}

export { ProcessManagerService };
export { ProcessManagerService as Service };

export interface ImplOpts {
  registry: Registry.AtomRegistry;
  kvStore: KeyValueStore.KeyValueStore;
  traceSink: Trace.Sink;
  serviceResolver?: ServiceResolver.ServiceResolver;
  handlerSet?: OperationHandlerSet.OperationHandlerSet;
  idGenerator?: ProcessIdGenerator;

  /**
   * Runtime name to stamp on trace messages emitted by processes spawned by this manager.
   * Identifies which runtime (local app, edge intrinsic, edge worker, ...) executed the code.
   * Per-spawn `Process.SpawnOptions.traceMeta.runtimeName` takes precedence over this default.
   */
  runtimeName?: Trace.RuntimeName;
}

export class Impl implements Manager {
  readonly #idGenerator: ProcessIdGenerator;
  readonly #handles = new Map<Process.ID, ProcessHandle.Impl<any, any, any>>();
  readonly #registry: Registry.AtomRegistry;
  readonly #kvStore: KeyValueStore.KeyValueStore;
  readonly #serviceResolver: ServiceResolver.ServiceResolver;
  readonly #handlerSet: OperationHandlerSet.OperationHandlerSet | undefined;
  readonly #traceSink: Trace.Sink;
  readonly #runtimeName: Trace.RuntimeName | undefined;
  readonly #store: ProcessStore;

  readonly #finished: Process.Process[] = [];
  readonly #processTreeAtom: Atom.Writable<readonly Process.Process[]>;
  /**
   * Manager-level ephemeral trace hub (DX-1125). Every process's ephemeral messages are fanned out
   * here so {@link subscribeToTraceMessages} can stream them (filtered) without
   * attaching to individual handles.
   */
  readonly #traceSubscribers: Queue.Queue<Trace.Message>[] = [];
  readonly #lifecycleSemaphore = Effect.runSync(Semaphore.make(1));
  #shutDown = false;

  constructor(opts: ImplOpts) {
    this.#idGenerator = opts.idGenerator ?? UUIDProcessIdGenerator;
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
    this.#serviceResolver = opts.serviceResolver ?? ServiceResolver.empty;
    this.#handlerSet = opts.handlerSet;
    this.#traceSink = opts.traceSink;
    this.#runtimeName = opts.runtimeName;
    this.#store = new ProcessStore(opts.kvStore);
    this.#processTreeAtom = Atom.make<readonly Process.Process[]>([]);
    this.#registry.mount(this.#processTreeAtom);
  }

  get processTreeAtom(): Atom.Atom<readonly Process.Process[]> {
    return this.#processTreeAtom;
  }

  subscribeToTraceMessages(filter: Trace.Filter): Stream.Stream<Trace.Message> {
    return Stream.unwrap(
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
    );
  }

  /**
   * Fan an ephemeral trace message out to all local trace subscribers (DX-1125).
   */
  #pushEphemeralToHub(message: Trace.Message): void {
    for (const queue of this.#traceSubscribers) {
      Queue.offerUnsafe(queue, message);
    }
  }

  get operationHandlerSet(): OperationHandlerSet.OperationHandlerSet {
    return this.#handlerSet ?? OperationHandlerSet.empty;
  }

  #hasNonTerminalChildren(parentPid: Process.ID): boolean {
    for (const handle of this.#handles.values()) {
      if (handle.parentId === parentPid && Impl.#isNonTerminal(handle)) {
        return true;
      }
    }
    return false;
  }

  #terminateChildren(parentPid: Process.ID): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const children = [...this.#handles.values()].filter(
        (handle) => handle.parentId === parentPid && Impl.#isNonTerminal(handle),
      );
      for (const child of children) {
        log('lifecycle: terminate child', { parentPid, childPid: child.pid });
        yield* child.terminate();
      }
    });
  }

  static #isNonTerminal(handle: ProcessHandle.Impl<any, any, any>): boolean {
    const { state } = handle.snapshotStatus();
    return !Process.isExited(state);
  }

  #buildProcessTreeSnapshot(): readonly Process.Process[] {
    return [...this.#finished, ...[...this.#handles.values()].map((handle) => handle.snapshotProcessInfo())];
  }

  #release(pid: Process.ID): void {
    const handle = this.#handles.get(pid);
    if (!handle) {
      return;
    }
    this.#handles.delete(pid);
    this.#finished.push(handle.snapshotProcessInfo());
    if (this.#finished.length > FINISHED_PROCESS_RETENTION) {
      this.#finished.shift();
    }
    this.#refreshProcessTree();
  }

  #isFinished(pid: Process.ID): boolean {
    return this.#finished.some((info) => info.pid === pid);
  }

  #refreshProcessTree(): void {
    this.#registry.set(this.#processTreeAtom, this.#buildProcessTreeSnapshot());
  }

  /**
   * Suspends every live process handle and drops all in-memory manager state.
   * Durable records remain in KV for external {@link Process.Handle.hydrate} after {@link startup}.
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
        this.#finished.length = 0;
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
    definition: Operation.Durable<I, O, any, _Rpcs>,
    options?: Process.SpawnOptions,
  ): Effect.Effect<Process.Handle<I, O, _Rpcs>> {
    return Effect.gen({ self: this }, function* () {
      const id = this.#idGenerator();
      log('lifecycle: spawn', {
        pid: id,
        key: definition.key,
        parentPid: options?.parentProcessId,
        name: options?.name,
      });
      const scope = yield* Scope.make();
      const dispatchContext = yield* EffectEx.contextWithoutParentSpan();
      const tracer = yield* Effect.tracer;
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

      let handleRef: ProcessHandle.Impl<I, O, any> | null = null;

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

      const ctx: Operation.DurableContext<I, O> = {
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

      // One controller per run, fired by {@link ProcessHandle.Impl.terminate} — the
      // local counterpart of the EDGE-provided Cancellation service.
      const cancellation = new AbortController();
      const origin = resolveOrigin(environment, options?.origin);
      let builtinCtx = originContext(origin).pipe(
        Context.add(Process.EnvironmentService, environment),
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
          origin,
          tracer,
        });
        builtinCtx = Context.add(builtinCtx, Operation.Service, childInvoker);
        builtinCtx = Context.add(builtinCtx, ProcessOperationInvoker.Service, childInvoker);
      }

      const builtinTagKeys = new Set([
        Process.EnvironmentService.key,
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
      markWork('process.services-resolved');

      const fullCtx = Context.merge(builtinCtx, serviceCtx);

      const handler = yield* definition.create(ctx).pipe(Effect.provide(fullCtx as Context.Context<any>));
      markWork('process.created');

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
            } else if (!this.#isFinished(handle.parentId)) {
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
        appendEvent: (event: import('./process-store.ts').PersistedEventInput) => this.#store.appendEvent(id, event),
        deleteRecord: () => this.#store.deleteProcess(id).pipe(Effect.tap(() => Effect.sync(() => this.#release(id)))),
      };

      // Operation.makeDurable spreads opts into the definition object at runtime; cast is safe at this boundary.
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
      const rpcClient = yield* makeLoopbackRpcClient(definition.rpcs, handler.rpcHandlers, scope);

      const handle = new ProcessHandle.Impl<I, O, any>(
        id,
        Option.getOrNull(parentOption),
        handler,
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

      // Write the initial durable record, spawn event included, before running onSpawn: one write
      // rather than a put and a read-modify-write, since each is an IndexedDB round trip on the
      // turn's critical path. The seq is passed to runOnSpawn so it's removed when the handler settles.
      const spawnSeq = 1;
      yield* this.#store.putProcess({
        id,
        key: definition.key,
        params: { name: params.name ?? null, annotations: params.annotations },
        environment: { space: environment.space, conversation: environment.conversation },
        parentId: Option.getOrNull(parentOption),
        ...(origin !== undefined ? { origin } : {}),
        state: Process.State.RUNNING,
        alarmDueAt: null,
        events: [{ _tag: 'spawn', seq: spawnSeq }],
      });
      markWork('process.persisted');
      yield* handle.runOnSpawn(spawnSeq);
      markWork('process.started');
      log('lifecycle: started', { pid: id, key: definition.key });

      // Runtime→public boundary: the live handle stores its RPC client untyped (`RpcClient<any>`),
      // while the public surface is the precise `Process.Handle<I, O, _Rpcs>`. `RpcClient` is invariant, so
      // bridging the two requires a cast here (see design spec §4.4).
      return handle as unknown as Process.Handle<I, O, _Rpcs>;
    }).pipe(Effect.withSpan('ProcessManager.spawn', { attributes: { [SpanAttributes.PROCESS.key]: definition.key } }));
  }

  /**
   * Re-hydrates a persisted process record into a live handle without running onSpawn.
   */
  #rehydrate(
    record: PersistedProcess,
    definition: Operation.Durable<any, any, any, any>,
  ): Effect.Effect<ProcessHandle.Impl<any, any, any>> {
    return Effect.gen({ self: this }, function* () {
      const id = record.id;
      log('lifecycle: rehydrate', { pid: id, key: record.key });

      const scope = yield* Scope.make();
      const dispatchContext = yield* EffectEx.contextWithoutParentSpan();
      const tracer = yield* Effect.tracer;
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

      let handleRef: ProcessHandle.Impl<any, any, any> | null = null;

      const params: Process.Params = {
        name: record.params.name,
        annotations: record.params.annotations,
      };

      const ctx: Operation.DurableContext<any, any> = {
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
      const origin = resolveOrigin(environment, record.origin);
      let builtinCtx = originContext(origin).pipe(
        Context.add(Process.EnvironmentService, environment),
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
          origin,
          tracer,
        });
        builtinCtx = Context.add(builtinCtx, Operation.Service, childInvoker);
        builtinCtx = Context.add(builtinCtx, ProcessOperationInvoker.Service, childInvoker);
      }

      const builtinTagKeys = new Set([
        Process.EnvironmentService.key,
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
      const handler = yield* definition.create(ctx).pipe(Effect.provide(fullCtx as Context.Context<any>));

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
        appendEvent: (event: import('./process-store.ts').PersistedEventInput) => this.#store.appendEvent(id, event),
        deleteRecord: () => this.#store.deleteProcess(id).pipe(Effect.tap(() => Effect.sync(() => this.#release(id)))),
      };

      // Operation.makeDurable spreads opts into the definition object at runtime; cast is safe at this boundary.
      const defRaw = definition as unknown as { input: Schema.Codec<any, any, never> };
      const encodeInput = (input: any): Effect.Effect<unknown> =>
        Schema.encodeEffect(defRaw.input)(input).pipe(Effect.orDie);

      const rpcClient = yield* makeLoopbackRpcClient(definition.rpcs, handler.rpcHandlers, scope);

      const handle = new ProcessHandle.Impl<any, any, any>(
        id,
        Option.getOrNull(parentOption),
        handler,
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
    }).pipe(Effect.withSpan('ProcessManager.rehydrate'));
  }

  #hydrateFromDefinition<I, O, Rpcs extends Rpc.Any = never>(
    id: Process.ID,
    definition: Operation.Durable<I, O, any, any>,
  ): Effect.Effect<Process.Handle<I, O, Rpcs>> {
    return Effect.gen({ self: this }, function* () {
      const existing = this.#handles.get(id);
      if (existing) {
        log('lifecycle: hydrate skipped (already live)', { pid: id });
        return existing as unknown as Process.Handle<I, O, Rpcs>;
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

      if (Process.isExited(record.state)) {
        yield* this.#store.deleteProcess(id);
        return yield* Effect.die(new Error(`Cannot hydrate terminal process: ${id}`));
      }

      log('lifecycle: hydrate', { pid: id, key: record.key });
      const handle = yield* this.#rehydrate(record, definition);
      return handle as unknown as Process.Handle<I, O, Rpcs>;
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
    }).pipe(Effect.withSpan('ProcessManager.discardRecord'));
  }

  attach<I, O, Rpcs extends Rpc.Any = never>(id: Process.ID): Effect.Effect<Process.Handle<I, O, Rpcs>> {
    return Effect.gen({ self: this }, function* () {
      const handle = this.#handles.get(id);
      if (!handle) {
        log('lifecycle: attach failed (not found)', { pid: id });
        return yield* Effect.die(new Error(`Process not found: ${id}`));
      }
      log('lifecycle: attached', { key: handle.key, state: handle.snapshotStatus().state });
      return handle as unknown as Process.Handle<I, O, Rpcs>;
    });
  }

  list(options?: Process.ListOptions): Effect.Effect<readonly Process.Handle.Any[]> {
    return Effect.gen({ self: this }, function* () {
      const results: Process.Handle.Any[] = [];
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
        if (Process.isExited(record.state)) {
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
 * Returned by {@link Impl.list} until {@link Process.Handle.hydrate} is called.
 */
class DormantHandle<I, O> implements Process.Handle<I, O, any> {
  readonly pid: Process.ID;
  readonly parentId: Process.ID | null;
  readonly key: string;
  readonly params: Process.Params;
  readonly environment: Process.Environment;
  readonly status: Process.Status;
  readonly statusAtom: Atom.Atom<Process.Status>;
  /** Carried on the persisted record, so a dormant handle still reports a pending alarm. */
  readonly alarmDueAt: number | null;
  // Dormant handles expose no live RPC surface; the empty client serves no requests. Stored untyped
  // (`RpcClient<any>`) so the dormant handle is assignable to `Process.Handle.Any` (see design spec §4.4).
  readonly rpc: RpcClient.RpcClient<any> = EMPTY_RPC_CLIENT;
  readonly #rehydrate: (definition: Operation.Durable<I, O, any, any>) => Effect.Effect<Process.Handle<I, O, any>>;
  readonly #discard: () => Effect.Effect<void>;

  constructor(
    record: PersistedProcess,
    rehydrate: (definition: Operation.Durable<I, O, any, any>) => Effect.Effect<Process.Handle<I, O, any>>,
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
    this.alarmDueAt = record.alarmDueAt;
  }

  hydrate = (definition: Operation.Durable<I, O, any, any>): Effect.Effect<Process.Handle<I, O, any>> =>
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
 * The {@link Process.ManagerService} is provided separately by the aggregate
 * {@link UnifiedProcessManager.layer}, which dispatches across this local manager and the remote
 * ({@link RemoteProcessManager.Service}) one.
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

      const manager = new Impl({
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
