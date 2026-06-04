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
import { ProcessDefinitionRegistry } from './process-definition-registry';
import { ProcessManagerService } from './process-manager-service';
import { ProcessStore } from './process-store';
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

export { ProcessDefinitionRegistry } from './process-definition-registry';
export { ProcessStore } from './process-store';
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
   * Restores non-terminal processes from durable storage after a restart.
   * Should be called once after construction, before handling new events.
   */
  restore(): Effect.Effect<void>;

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
  definitions?: ProcessDefinitionRegistry;

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
  readonly #definitions: ProcessDefinitionRegistry;

  readonly #processTreeAtom: Atom.Writable<readonly Process.Info[]>;
  readonly #monitor: Process.Monitor;

  constructor(opts: ProcessManagerImplOpts) {
    this.#idGenerator = opts.idGenerator ?? UUIDProcessIdGenerator;
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
    this.#serviceResolver = opts.serviceResolver ?? ServiceResolver.empty;
    this.#handlerSet = opts.handlerSet;
    this.#traceSink = opts.traceSink;
    this.#runtimeName = opts.runtimeName;
    this.#store = new ProcessStore(opts.kvStore);
    this.#definitions = opts.definitions ?? new ProcessDefinitionRegistry();
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
   * Suspends every spawned process handle (preserving durable state) and clears the handle map.
   * Suspended processes can be restored on the next boot via {@link restore}.
   */
  shutdown(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const handleCount = this.#handles.size;
      if (handleCount === 0) {
        log('lifecycle: manager shutdown skipped');
        return;
      }
      log('lifecycle: manager suspending', { handleCount, pids: [...this.#handles.keys()] });
      for (const handle of this.#handles.values()) {
        yield* handle.suspend();
      }
      this.#handles.clear();
      this.#refreshProcessTree();
      log('lifecycle: manager suspended', { suspended: handleCount });
    });
  }

  spawn<I, O>(definition: Process.Process<I, O, any>, options?: SpawnOptions): Effect.Effect<Handle<I, O>> {
    return Effect.gen(this, function* () {
      // Auto-register the definition so it can be looked up during restore.
      this.#definitions.register(definition);

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
      const persistence: ProcessHandle.Persistence = {
        setAlarm: (dueAt) => this.#store.setAlarm(id, dueAt),
        setState: (state) => this.#store.setState(id, state),
        removeEvent: (seq) => this.#store.removeEvent(id, seq),
        appendEvent: (event) => this.#store.appendEvent(id, event),
        deleteRecord: () => this.#store.deleteProcess(id),
      };

      // Process.make spreads opts into the definition object at runtime; cast is safe at this boundary.
      const defRaw = definition as unknown as { input: Schema.Schema<I, any, never> };
      const encodeInput = (input: I): Effect.Effect<unknown> => Schema.encode(defRaw.input)(input).pipe(Effect.orDie);

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
        persistence,
        false,
        encodeInput,
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
  #rehydrate(record: import('./process-store').PersistedProcess, definition: Process.Process<any, any, any>): Effect.Effect<void> {
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
        succeed: () => { handleRef?.requestSucceed(); },
        fail: (error: Error) => { handleRef?.requestFail(error); },
        submitOutput: (output: any) => { handleRef?.requestSubmitOutput(output); },
        setAlarm: (timeout?: number) => { handleRef?.requestAlarm(timeout); },
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

      const persistence: ProcessHandle.Persistence = {
        setAlarm: (dueAt) => this.#store.setAlarm(id, dueAt),
        setState: (state) => this.#store.setState(id, state),
        removeEvent: (seq) => this.#store.removeEvent(id, seq),
        appendEvent: (event) => this.#store.appendEvent(id, event),
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
        persistence,
        true, // restoring — suppresses onSpawn
        encodeInput,
        record.state, // restore the persisted state instead of defaulting to RUNNING
      );
      handleRef = handle;
      this.#handles.set(id, handle);
      this.#refreshProcessTree();

      // Re-arm a still-pending alarm.
      if (record.alarmDueAt !== null) {
        handle.rearmAlarm(record.alarmDueAt);
      }

      // Re-deliver events that never settled (interrupted by shutdown), in seq order.
      const pendingEvents = [...record.events].sort((a, b) => a.seq - b.seq);
      for (const event of pendingEvents) {
        yield* handle.redeliver(event, definition);
      }
    });
  }

  restore(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const records = yield* this.#store.listProcesses();
      log('lifecycle: restore', { count: records.length });
      for (const record of records) {
        if (
          record.state === Process.State.SUCCEEDED ||
          record.state === Process.State.FAILED ||
          record.state === Process.State.TERMINATED
        ) {
          // Stale terminal record; clean it up.
          yield* this.#store.deleteProcess(record.id);
          continue;
        }
        const definition = this.#definitions.get(record.key);
        if (!definition) {
          log.warn('lifecycle: restore skipped (definition not registered)', { pid: record.id, key: record.key });
          continue;
        }
        yield* this.#rehydrate(record, definition);
      }
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
    return Effect.sync(() => {
      let impls: ProcessHandle.ProcessHandleImpl<any, any, any>[] = [...this.#handles.values()];
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

/**
 * Scoped layer that provides ProcessManager and ProcessMonitorService.
 * On scope close, the manager's `shutdown()` runs (layer finalizer), suspending
 * process state so it can be restored on the next boot.
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
  /**
   * Registry of process definitions used during restore.
   */
  definitions?: ProcessDefinitionRegistry;
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
        definitions: opts?.definitions,
      });

      yield* Effect.addFinalizer(() => manager.shutdown());

      return Context.mergeAll(
        Context.make(ProcessManagerService, manager),
        Context.make(Process.ProcessMonitorService, manager.monitor),
      );
    }),
  );
