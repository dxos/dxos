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

import { DXN } from '@dxos/echo';
import { LayerSpec, Process, ServiceResolver, StorageService, Trace } from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Operation, OperationHandlerSet } from '@dxos/operation';
import type { ObjectId } from '@dxos/protocols';

import { ProcessNotFoundError, ServiceNotAvailableError } from './errors';
import { type ProcessIdGenerator, UUIDProcessIdGenerator } from './process-id';
import { ProcessHandleImpl, type OutputItem } from './ProcessHandle';
import * as ProcessOperationInvoker from './ProcessOperationInvoker';
import { createProcessTraceService } from './process-trace';
import { layer as storageServiceLayer } from './storage-service-layer';

export { type ProcessIdGenerator, UUIDProcessIdGenerator, SequentialProcessIdGenerator } from './process-id';

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
  readonly conversation?: DXN.String;
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

export interface ProcessManagerImplOpts {
  registry: Registry.Registry;
  kvStore: KeyValueStore.KeyValueStore;
  traceSink: Trace.Sink;
  serviceResolver?: ServiceResolver.ServiceResolver;
  handlerSet?: OperationHandlerSet.OperationHandlerSet;
  idGenerator?: ProcessIdGenerator;
}

export class ProcessManagerImpl implements Manager {
  readonly #idGenerator: ProcessIdGenerator;
  readonly #handles = new Map<Process.ID, ProcessHandleImpl<any, any, any>>();
  readonly #registry: Registry.Registry;
  readonly #kvStore: KeyValueStore.KeyValueStore;
  readonly #serviceResolver: ServiceResolver.ServiceResolver;
  readonly #handlerSet: OperationHandlerSet.OperationHandlerSet | undefined;
  readonly #traceSink: Trace.Sink;

  readonly #processTreeAtom: Atom.Writable<readonly Process.Info[]>;
  readonly #monitor: Process.Monitor;

  constructor(opts: ProcessManagerImplOpts) {
    this.#idGenerator = opts.idGenerator ?? UUIDProcessIdGenerator;
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
    this.#serviceResolver = opts.serviceResolver ?? ServiceResolver.empty;
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

      let builtinCtx = Context.empty().pipe(
        Context.add(StorageService, storage),
        Context.add(Scope.Scope, scope),
        Context.add(
          Trace.TraceService,
          createProcessTraceService({
            pid: id,
            parentPid: options?.parentProcessId,
            processName: params.name ?? undefined,
            traceMeta: options?.traceMeta,
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
        StorageService.key,
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
          Effect.catchTag('ServiceNotAvailable', (err) =>
            Effect.die(
              new ServiceNotAvailableError({
                message: err.message,
                context: { ...err.context, process: definition.key, processName: params.name },
              }),
            ),
          ),
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

/**
 * Scoped layer that provides ProcessManager and ProcessMonitorService.
 * On scope close, the manager's `shutdown()` runs (layer finalizer), stopping
 * alarms and process work so the shared Atom registry is not updated after disposal.
 *
 * Requires KeyValueStore, ServiceResolver, OperationHandlerSet.OperationHandlerProvider,
 * and Registry.AtomRegistry from the environment.
 */
export const layer = (opts?: {
  idGenerator?: ProcessIdGenerator;
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
      });

      yield* Effect.addFinalizer(() => manager.shutdown());

      return Context.mergeAll(
        Context.make(ProcessManagerService, manager),
        Context.make(Process.ProcessMonitorService, manager.monitor),
      );
    }),
  );

