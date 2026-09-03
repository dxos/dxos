//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import type * as Rpc from 'effect/unstable/rpc/Rpc';

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';
import { Annotation } from '@dxos/echo';
import { log } from '@dxos/log';
import type { ProcessProtocol } from '@dxos/protocols';

import type * as ProcessManager from './ProcessManager';
import { toInfo, toProcessId } from './remote-process-info';
import * as RemoteProcessHandle from './RemoteProcessHandle';
import type * as RemoteProcessManager from './RemoteProcessManager';

/**
 * Presents a remote runtime's {@link RemoteProcessManager.Control} surface as a local
 * {@link ProcessManager.Manager}.
 *
 * Lets code written against the in-process manager verbs drive a remote host — `AgentService`
 * spawns `AgentProcess` through it when a session asks for `location: 'edge'`. Transport-agnostic:
 * it needs only a `Control`, whose EDGE implementation lives in `@dxos/edge-compute`.
 *
 * This is a façade, NOT a stand-in for `ProcessManager.Service`: that tag means local
 * execution, and binding a remote manager to it would report edge processes as local in the
 * aggregate `ProcessMonitor` tree. Remote processes belong to {@link RemoteProcessManager.Service},
 * whose `control` this adapts.
 *
 * A remote host cannot be handed a process definition, so {@link spawn} sends the definition's `key`
 * and the host resolves it against the processes it hosts; a key the host does not know fails the
 * spawn.
 */
export class RemoteProcessManagerAdapter implements ProcessManager.Manager {
  readonly #control: RemoteProcessManager.Control;
  readonly #space: string;
  readonly #registry: Registry.AtomRegistry;
  readonly #processTreeAtom: Atom.Writable<readonly Process.Info[]>;
  readonly #monitor: Process.Monitor;

  /**
   * Bound to one `space`, because the `ProcessManager.Manager` verbs it implements carry no space
   * while every `Control` verb does. The `Control` itself stays space-free, so one
   * {@link RemoteProcessManager.Manager} serves every space a client has open.
   *
   * `processTreeAtom` lets the caller supply the atom to publish into — pass the owning
   * {@link RemoteProcessManager.Manager}'s, so a spawn through this façade is visible in the same
   * atom the aggregate `ProcessMonitor` reads. Omitted, the adapter owns a private one and its
   * spawns are invisible to that monitor.
   */
  constructor(
    control: RemoteProcessManager.Control,
    space: string,
    registry: Registry.AtomRegistry,
    processTreeAtom?: Atom.Writable<readonly Process.Info[]>,
  ) {
    this.#control = control;
    this.#space = space;
    this.#registry = registry;
    if (processTreeAtom) {
      this.#processTreeAtom = processTreeAtom;
    } else {
      this.#processTreeAtom = Atom.make<readonly Process.Info[]>([]);
      this.#registry.mount(this.#processTreeAtom);
    }
    this.#monitor = {
      processTree: this.#refreshProcessTree,
      processTreeAtom: this.#processTreeAtom,
      // Per-process ephemeral trace is served by `Handle.subscribeEphemeral`; a manager-wide stream
      // needs a push transport the cursor protocol does not provide (see DESIGN D7).
      subscribeToTraceMessages: (_filter: Trace.Filter): Stream.Stream<Trace.Message> => Stream.empty,
    };
  }

  get operationHandlerSet(): OperationHandlerSet.OperationHandlerSet {
    // Operations invoked by a remote process are resolved by the remote runtime's own handler set;
    // the client contributes none.
    return OperationHandlerSet.empty;
  }

  get monitor(): Process.Monitor {
    return this.#monitor;
  }

  spawn<I, O, Rpcs extends Rpc.Any = never>(
    definition: Process.Process<I, O, any, Rpcs>,
    options?: ProcessManager.SpawnOptions,
  ): Effect.Effect<ProcessManager.Handle<I, O, Rpcs>> {
    return this.#spawn(definition.key, options, definition);
  }

  /**
   * Spawn by `Process.key` alone, without a local definition.
   *
   * Only the key crosses the wire — the host resolves it against the processes it hosts — so a
   * definition is not what identifies a remote process. It supplies the input/output codecs and the
   * RPC group, which is the only reason {@link spawn} takes one; without it the returned handle is a
   * metadata and lifecycle view, and its typed surface throws until `Handle.hydrate` attaches one.
   */
  spawnByKey(key: string, options?: ProcessManager.SpawnOptions): Effect.Effect<ProcessManager.Handle.Any> {
    return this.#spawn(key, options);
  }

  #spawn<I, O, Rpcs extends Rpc.Any = never>(
    key: string,
    options?: ProcessManager.SpawnOptions,
    definition?: Process.Process<I, O, any, Rpcs>,
  ): Effect.Effect<ProcessManager.Handle<I, O, Rpcs>> {
    return Effect.gen({ self: this }, function* () {
      const annotations = Annotation.buildDictionary((dictionary) => {
        if (options?.target !== undefined) {
          Annotation.setDictionary(dictionary, Process.TargetAnnotation, options.target);
        }
        if (options?.notify !== undefined) {
          Annotation.setDictionary(dictionary, Process.NotifyAnnotation, options.notify);
        }
        Object.assign(dictionary, options?.annotations ?? {});
      });
      // Rejected here, where the caller's stack still names the annotation.
      assertJsonSafe(annotations);

      const info = yield* this.#control.spawn(this.#space, {
        key,
        ...(options?.name !== undefined ? { name: options.name } : {}),
        ...(options?.parentProcessId !== undefined ? { parentPid: options.parentProcessId } : {}),
        ...(options?.environment !== undefined ? { environment: options.environment } : {}),
        annotations,
      });
      log('remote process spawned', { pid: info.pid, key: info.key });
      // The process now exists on the host, so a later failure here would strand it: a caller that
      // retries would spawn a second one and never hold the first.
      const handle = yield* this.#makeHandle<I, O, Rpcs>(info, definition).pipe(
        Effect.onError(() => this.#control.terminate(this.#space, toProcessId(info.pid)).pipe(Effect.ignore)),
      );
      // The aggregate `Process.Monitor` reads the tree atom rather than calling this manager, so the
      // atom has to be current by the time spawn returns. Failing to read it back does not
      // invalidate the spawn.
      yield* this.#refreshProcessTree.pipe(Effect.ignore);
      return handle;
    });
  }

  attach<I, O, Rpcs extends Rpc.Any = never>(id: Process.ID): Effect.Effect<ProcessManager.Handle<I, O, Rpcs>> {
    // No definition is available by id alone, so the returned handle is a metadata view until the
    // caller re-attaches it to one via `Handle.hydrate`'s local counterpart (`spawn`'s definition).
    return this.#control.status(this.#space, id).pipe(Effect.flatMap((info) => this.#makeHandle<I, O, Rpcs>(info)));
  }

  list(options?: ProcessManager.ListOptions): Effect.Effect<readonly ProcessManager.Handle.Any[]> {
    return this.#control
      .list(this.#space, {
        ...(options?.key !== undefined ? { key: options.key } : {}),
        ...(options?.target !== undefined ? { target: options.target } : {}),
        ...(options?.state !== undefined ? { state: options.state } : {}),
      })
      .pipe(
        Effect.flatMap((processes) =>
          Effect.forEach(
            processes.filter(
              // `parentProcessId` has no server-side filter (the host indexes by key/target/state),
              // so it is applied here rather than silently ignored.
              (info) => options?.parentProcessId === undefined || info.parentPid === options.parentProcessId,
            ),
            (info) => this.#makeHandle(info),
          ),
        ),
      );
  }

  runAllProcessesToCompletion(): Effect.Effect<void> {
    return this.list().pipe(
      Effect.flatMap((handles) => Effect.forEach(handles, (handle) => handle.runToCompletion(), { discard: true })),
    );
  }

  shutdown(): Effect.Effect<void> {
    // The remote host owns process lifecycle across client restarts — that is the point of hosting
    // them there — so a client teardown suspends nothing.
    return Effect.void;
  }

  startup(): Effect.Effect<void> {
    // The host's processes outlive the client, so a fresh adapter has to read them rather than start
    // from an empty tree — otherwise the aggregate monitor reports nothing until the next spawn.
    return this.#refreshProcessTree.pipe(Effect.asVoid);
  }

  #makeHandle<I, O, Rpcs extends Rpc.Any>(
    info: ProcessProtocol.ProcessInfo,
    definition?: Process.Process<I, O, any, Rpcs>,
  ): Effect.Effect<ProcessManager.Handle<I, O, Rpcs>> {
    return RemoteProcessHandle.RemoteProcessHandle.make<I, O, Rpcs>({
      info,
      control: this.#control,
      space: this.#space,
      ...(definition !== undefined ? { definition } : {}),
      registry: this.#registry,
      onLifecycleChange: this.#refreshProcessTree.pipe(Effect.ignore, Effect.asVoid),
    });
  }

  get #refreshProcessTree(): Effect.Effect<readonly Process.Info[]> {
    return this.#control.list(this.#space).pipe(
      Effect.map((processes) => processes.map(toInfo)),
      Effect.tap((tree) => Effect.sync(() => this.#registry.update(this.#processTreeAtom, () => tree))),
    );
  }
}

/**
 * Fails when an annotation is not already a JSON value: the wire protocol carries them as JSON, and a
 * `Date`, `Map`, `NaN`, class instance or nested `undefined` would silently reach the host as
 * something else.
 */
const assertJsonSafe = (annotations: Annotation.Dictionary): void => {
  for (const [key, value] of Object.entries(annotations)) {
    if (!isJsonValue(value, new Set())) {
      throw new TypeError(`Process annotation '${key}' is not a JSON value`);
    }
  }
};

/**
 * Whether a value is what `JSON.parse` could have produced — checked structurally, since a value
 * compared against its own round trip matches however lossy its encoding was.
 */
const isJsonValue = (value: unknown, seen: Set<object>): boolean => {
  switch (typeof value) {
    case 'boolean':
    case 'string':
      return true;
    case 'number':
      // `NaN` and the infinities encode as `null`.
      return Number.isFinite(value);
    case 'object': {
      if (value === null) {
        return true;
      }
      if (seen.has(value)) {
        // A cycle throws in `JSON.stringify`.
        return false;
      }
      seen.add(value);
      if (Array.isArray(value)) {
        return value.every((entry) => isJsonValue(entry, seen));
      }
      // Anything with a prototype of its own (a `Date`, a `Map`, a class instance) encodes as
      // something other than itself.
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        return false;
      }
      return Object.values(value).every((entry) => isJsonValue(entry, seen));
    }
    default:
      // `undefined`, functions and symbols are dropped; a `bigint` throws.
      return false;
  }
};
