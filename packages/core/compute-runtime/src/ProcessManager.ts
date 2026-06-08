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

import { LayerSpec, Process, ServiceResolver, Trace } from '@dxos/compute';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import * as StorageService from '@dxos/compute/StorageService';
import type { SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ProcessIdGenerator, UUIDProcessIdGenerator } from './process-id';
import { ProcessManagerService } from './process-manager-service';
import { ProcessStore, type PersistedProcess } from './process-store';
import { createProcessTraceService } from './process-trace';
import * as ProcessHandle from './ProcessHandle';
import * as ProcessOperationInvoker from './ProcessOperationInvoker';
import { layer as storageServiceLayer } from './storage-service-layer';

export {
  type ProcessIdGenerator,
  UUIDProcessIdGenerator,
  SequentialProcessIdGenerator,
  SequentialProcessIdGenerator as SequentialIdGenerator,
} from './process-id';

export { ProcessOperationInvoker };

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

  /**
   * Hydrates a dormant persisted process using the supplied definition.
   * No-op when the handle is already live (returns self).
   */
  hydrate(definition: Process.Process<I, O, any>): Effect.Effect<Handle<I, O>>;
}

export namespace Handle {
  export type Any = Handle<any, any>;
}

/**
 * Environment influences what services are available to the process.
 */
export interface Environment {
  readonly space?: SpaceId;
  readonly conversation?: URI.URI;
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
  readonly target?: URI.URI;

  /**
   * Tracing metadata for this invocation.
   */
  readonly traceMeta?: Trace.Meta;

  readonly environment?: Environment;

  /**
   * User-facing notifications requested for this process's lifecycle phases.
   * Surfaced on {@link Process.Info} for the notification tracker.
   */
  readonly notify?: Process.Params['notify'];
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
    readonly target: URI.URI | null;
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
  if (options?.target !== undefined && fields.target !== options.target) {
    return false;
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
  spawn<I, O>(definition: Process.Process<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>>;

  /**
   * Attach to an existing process.
   */
  attach<I, O>(id: Process.ID): Effect.Effect<Handle<I, O>>;

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
}

export { ProcessManagerService };
export { ProcessManagerService as Service };

export interface ProcessManagerImplOpts {
  registry: Registry.Registry;
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
  readonly #registry: Registry.Registry;
  readonly #kvStore: KeyValueStore.KeyValueStore;
  readonly #serviceResolver: ServiceResolver.ServiceResolver;
  readonly #handlerSet: OperationHandlerSet.OperationHandlerSet | undefined;
  readonly #traceSink: Trace.Sink;
  readonly #runtimeName: Trace.RuntimeName | undefined;
  readonly #store: ProcessStore;

  readonly #processTreeAtom: Atom.Writable<readonly Process.Info[]>;
  readonly #monitor: Process.Monitor;
  readonly #lifecycleSemaphore = Effect.runSync(Effect.makeSemaphore(1));
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
      if (handle.parentId === parentPid && ProcessManagerImpl.#isNonTerminal(handle)) {
        return true;
      }
    }
    return false;
  }

  #terminateChildren(parentPid: Process.ID): Effect.Effect<void> {
    return Effect.gen(this, function* () {
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
    return (
      state !== Process.State.SUCCEEDED && state !== Process.State.FAILED && state !== Process.State.TERMINATED
    );
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
      Effect.gen(this, function* () {
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
      const outputQueue = yield* Queue.unbounded<ProcessHandle.OutputItem<O>>();

      const storage = storageServiceLayer(this.#kvStore, `process/${id}/`);

      const parentOption = Option.fromNullable(options?.parentProcessId);

      const parentHandle =
        options?.parentProcessId !== undefined ? this.#handles.get(options.parentProcessId) : undefined;
      const environment: Environment = {
        ...(parentHandle !== undefined ? parentHandle.environment : {}),
        ...options?.environment,
      };

      const resolutionContext: LayerSpec.LayerContext = {
        space: environment.space,
        conversation: environment.conversation,
        process: id,
      };

      let handleRef: ProcessHandle.ProcessHandleImpl<I, O, any> | null = null;

      const params: Process.Params = {
        name: options?.name ?? null,
        target: options?.target ?? null,
        ...(options?.notify ? { notify: options.notify } : {}),
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

      let builtinCtx = Context.empty().pipe(
        Context.add(StorageService.StorageService, storage),
        Context.add(Scope.Scope, scope),
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
            onEphemeral: (message) => handleRef?.pushEphemeral(message),
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
        StorageService.StorageService.key,
        Scope.Scope.key,
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
      const defRaw = definition as unknown as { input: Schema.Schema<I, any, never> };
      // Fall back to null rather than crashing if encoding fails (e.g. operation passed undefined
      // for a Struct({}) input schema). The handler still receives the original typed value;
      // re-delivery after restart will see null and may also fail, but that is best-effort by design.
      const encodeInput = (input: I): Effect.Effect<unknown> =>
        Schema.encode(defRaw.input)(input).pipe(Effect.orElseSucceed(() => null));

      const handle = new ProcessHandle.ProcessHandleImpl<I, O, any>(
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
        () => this.#terminateChildren(id),
        persistence,
        false,
        encodeInput,
        undefined,
      );
      handleRef = handle;
      this.#handles.set(id, handle);
      this.#refreshProcessTree();

      // Write initial durable record before running onSpawn.
      yield* this.#store.putProcess({
        id,
        key: definition.key,
        params: { name: params.name ?? null, target: params.target ?? null, notify: params.notify ?? null },
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

      return handle;
    });
  }

  /**
   * Re-hydrates a persisted process record into a live handle without running onSpawn.
   */
  #rehydrate(
    record: PersistedProcess,
    definition: Process.Process<any, any, any>,
  ): Effect.Effect<ProcessHandle.ProcessHandleImpl<any, any, any>> {
    return Effect.gen(this, function* () {
      const id = record.id;
      log('lifecycle: rehydrate', { pid: id, key: record.key });

      const scope = yield* Scope.make();
      const outputQueue = yield* Queue.unbounded<ProcessHandle.OutputItem<any>>();
      const storage = storageServiceLayer(this.#kvStore, `process/${id}/`);

      const parentOption = Option.fromNullable(record.parentId);
      // Deserialization boundary: schema stores space/conversation as plain strings;
      // cast back to opaque branded types.
      const environment: Environment = {
        space: record.environment.space as SpaceId | undefined,
        conversation: record.environment.conversation as URI.URI | undefined,
      };

      const resolutionContext: LayerSpec.LayerContext = {
        space: environment.space,
        conversation: environment.conversation,
        process: id,
      };

      let handleRef: ProcessHandle.ProcessHandleImpl<any, any, any> | null = null;

      // Deserialization boundary: schema stores target/notify as plain unknown values;
      // cast back to their structural types.
      const params: Process.Params = {
        name: record.params.name,
        target: record.params.target as URI.URI | null,
        ...(record.params.notify != null ? { notify: record.params.notify as Process.Params['notify'] } : {}),
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
        setAlarm: (timeout?: number) => {
          handleRef?.requestAlarm(timeout);
        },
      };

      let builtinCtx = Context.empty().pipe(
        Context.add(StorageService.StorageService, storage),
        Context.add(Scope.Scope, scope),
        Context.add(
          Trace.TraceService,
          createProcessTraceService({
            pid: id,
            parentPid: record.parentId ?? undefined,
            processName: params.name ?? undefined,
            runtimeName: this.#runtimeName,
            space: environment.space,
            sink: this.#traceSink,
            onEphemeral: (message) => handleRef?.pushEphemeral(message),
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
        StorageService.StorageService.key,
        Scope.Scope.key,
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
      const defRaw = definition as unknown as { input: Schema.Schema<any, any, never> };
      const encodeInput = (input: any): Effect.Effect<unknown> => Schema.encode(defRaw.input)(input).pipe(Effect.orDie);

      const handle = new ProcessHandle.ProcessHandleImpl<any, any, any>(
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
        () => this.#terminateChildren(id),
        persistence,
        true, // restoring — suppresses onSpawn
        encodeInput,
        record.state, // hydrate the persisted state instead of defaulting to RUNNING
      );
      handleRef = handle;
      this.#handles.set(id, handle);
      this.#refreshProcessTree();

      // Re-arm a still-pending alarm.
      if (record.alarmDueAt !== null) {
        handle.rearmAlarm(record.alarmDueAt);
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
    });
  }

  #hydrateFromDefinition<I, O>(id: Process.ID, definition: Process.Process<I, O, any>): Effect.Effect<Handle<I, O>> {
    return Effect.gen(this, function* () {
      const existing = this.#handles.get(id);
      if (existing) {
        log('lifecycle: hydrate skipped (already live)', { pid: id });
        return existing as unknown as Handle<I, O>;
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
      return handle as unknown as Handle<I, O>;
    });
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
    return Effect.gen(this, function* () {
      const results: Handle.Any[] = [];
      const seenIds = new Set<Process.ID>();

      for (const handle of this.#handles.values()) {
        if (
          !matchesListOptions(
            {
              key: handle.key,
              parentId: handle.parentId,
              state: handle.snapshotStatus().state,
              target: handle.params.target,
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
              target: record.params.target as URI.URI | null,
            },
            options,
          )
        ) {
          continue;
        }
        results.push(new DormantHandle(record, (definition) => this.#hydrateFromDefinition(record.id, definition)));
      }

      return results;
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

/**
 * Read-only handle view of a persisted process that is not currently live.
 * Returned by {@link ProcessManagerImpl.list} until {@link Handle.hydrate} is called.
 */
class DormantHandle<I, O> implements Handle<I, O> {
  readonly pid: Process.ID;
  readonly parentId: Process.ID | null;
  readonly key: string;
  readonly params: Process.Params;
  readonly environment: Environment;
  readonly status: Status;
  readonly statusAtom: Atom.Atom<Status>;
  readonly #rehydrate: (definition: Process.Process<I, O, any>) => Effect.Effect<Handle<I, O>>;

  constructor(
    record: PersistedProcess,
    rehydrate: (definition: Process.Process<I, O, any>) => Effect.Effect<Handle<I, O>>,
  ) {
    this.#rehydrate = rehydrate;
    this.pid = record.id;
    this.parentId = record.parentId;
    this.key = record.key;
    this.params = {
      name: record.params.name,
      target: record.params.target as URI.URI | null,
      ...(record.params.notify != null ? { notify: record.params.notify as Process.Params['notify'] } : {}),
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

  hydrate = (definition: Process.Process<I, O, any>): Effect.Effect<Handle<I, O>> => this.#rehydrate(definition);

  submitInput = (): Effect.Effect<void> => Effect.die(new Error('Process not hydrated'));

  subscribeOutputs = (): Stream.Stream<O> => Stream.die(new Error('Process not hydrated'));

  subscribeEphemeral = (): Stream.Stream<Trace.Message> => Stream.die(new Error('Process not hydrated'));

  terminate = (): Effect.Effect<void> => Effect.die(new Error('Process not hydrated'));

  runToCompletion = (): Effect.Effect<void> => Effect.die(new Error('Process not hydrated'));

  runAndExit = (): Stream.Stream<O> => Stream.die(new Error('Process not hydrated'));
}

/**
 * Scoped layer that provides ProcessManager and ProcessMonitorService.
 * On scope close, the manager's `shutdown()` runs (layer finalizer), suspending
 * process state so it can be hydrated on the next boot.
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
  ProcessManagerService | Process.ProcessMonitorService,
  never,
  | KeyValueStore.KeyValueStore
  | ServiceResolver.ServiceResolver
  | OperationHandlerSet.OperationHandlerProvider
  | Registry.AtomRegistry
  | Trace.TraceSink
> =>
  Layer.scopedContext(
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

      return Context.mergeAll(
        Context.make(ProcessManagerService, manager),
        Context.make(Process.ProcessMonitorService, manager.monitor),
      );
    }),
  );
