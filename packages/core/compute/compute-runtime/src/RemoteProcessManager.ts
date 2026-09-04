//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import type * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';
import { Annotation } from '@dxos/echo';
import type { SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
// `Process.Info.error` is already a `SerializedError`, so the snapshot and its exit event speak the
// same error shape as the domain type they extend.
import type { SerializedError } from '@dxos/protocols';

import type * as ProcessManager from './ProcessManager';
import * as RemoteProcessHandle from './RemoteProcessHandle';

/**
 * Cancel target for a remote (EDGE) run — the {@link Manager.cancel} argument. Addressed by `trigger`
 * (the stable cross-boundary key) in `space`; `pid` is carried for correlation/telemetry only. Ids are
 * strings to keep this interface free of `@dxos/keys` value imports.
 */
export type CancelTarget = {
  readonly space: string;
  readonly trigger: string;
  readonly pid?: string;
};

/**
 * A process on a remote runtime as this client sees it: {@link Process.Info} plus the one thing a
 * remote caller cannot otherwise know.
 */
export interface Snapshot extends Process.Info {
  /**
   * Absolute due-time (epoch ms) of the process's pending alarm, or `null` when none is scheduled.
   * Distinguishes hybernation waiting on more queued turn work from hybernation waiting only on
   * background children — the difference between `runToCompletion` and `runUntilSettled`, which
   * cannot be told apart remotely without it.
   */
  readonly alarmDueAt: number | null;
}

/**
 * One event in a process's output/trace log. `seq` is monotonic per process and is what a cursor
 * read advances over, so a client that reconnects resumes where it left off.
 */
export type Event =
  | { readonly _tag: 'output'; readonly seq: number; readonly data: unknown }
  | { readonly _tag: 'trace'; readonly seq: number; readonly message: Trace.Message }
  | {
      readonly _tag: 'exited';
      readonly seq: number;
      readonly outcome: 'succeeded' | 'failed' | 'terminated';
      readonly error?: SerializedError;
    };

/** Page of events at or after a requested cursor, plus the process's state at read time. */
export interface EventPage {
  readonly events: readonly Event[];
  /**
   * Cursor for the next read: the `seq` of the next unread event. A read at `cursor` returns events
   * with `seq >= cursor`, so a read at or beyond the end returns an empty page whose `cursor` is the
   * current end — which is how a caller subscribes to new events only.
   */
  readonly cursor: number;
  /**
   * True when events before `cursor` were dropped from the host's bounded ring before the caller
   * read them: the output history is incomplete and should be reported as such rather than treated
   * as contiguous.
   */
  readonly truncated: boolean;
  readonly snapshot: Snapshot;
}

/** Addresses one process. Every verb is space-scoped because processes are per-space on the host. */
export interface ProcessTarget {
  readonly spaceId: SpaceId;
  readonly pid: Process.ID;
}

export interface SpawnRequest {
  readonly spaceId: SpaceId;
  /** `Process.Process.key` of a process the host hosts; a definition cannot cross the wire. */
  readonly key: string;
  readonly name?: string;
  readonly parentPid?: Process.ID;
  readonly environment?: Process.Environment;
  readonly annotations?: Annotation.Dictionary;
}

/** Filters mirroring `ProcessManager.ListOptions`. */
export interface ListRequest {
  readonly spaceId: SpaceId;
  readonly key?: string;
  readonly target?: string;
  readonly state?: Process.State;
}

/**
 * Full control surface for processes hosted by a remote runtime, mirroring the local
 * `ProcessManager.Manager`/`ProcessManager.Handle` verbs.
 *
 * Stated in domain types, not wire types: the `ProcessProtocol` shapes are the transport's business
 * and decoding them is the implementation's job, so a consumer of this interface never sees them.
 *
 * A remote host cannot be handed a process definition (it is a closure), so {@link spawn} names one
 * of the host's built-in processes by its `Process.key`.
 *
 * One manager serves all of a client's spaces — the space travels with each call — so a stack needs
 * no instance per space.
 *
 * Effects carry no error channel, matching the local manager: transport and host failures surface as
 * defects.
 */
export interface Control {
  /** Spawn one of the host's built-in processes. */
  spawn(request: SpawnRequest): Effect.Effect<Snapshot>;

  list(request: ListRequest): Effect.Effect<readonly Snapshot[]>;

  status(target: ProcessTarget): Effect.Effect<Snapshot>;

  /** Submit an input already encoded via the process definition's input schema. */
  submitInput(target: ProcessTarget & { readonly input: unknown }): Effect.Effect<void>;

  /**
   * Build a client for the process's declared RPC group. The host serves the group as
   * effect-rpc-over-HTTP, so the returned client is a real {@link RpcClient.RpcClient} and the
   * transport (endpoint, credential, serialization) is the implementation's concern.
   */
  makeRpcClient<Rpcs extends Rpc.Any>(
    target: ProcessTarget & { readonly group: RpcGroup.RpcGroup<Rpcs> },
  ): Effect.Effect<RpcClient.RpcClient<Rpcs>, never, Scope.Scope>;

  terminate(target: ProcessTarget): Effect.Effect<void>;

  /**
   * Read the process's outputs and ephemeral trace at or after `cursor`. Cursor-based rather than
   * pushed so a client that reloads resumes an in-flight remote process where it left off.
   */
  readEvents(target: ProcessTarget & { readonly cursor: number }): Effect.Effect<EventPage>;
}

/**
 * View of processes running on a remote runtime (EDGE): the process tree, a cancel control, and
 * optionally the full {@link Control} surface.
 *
 * Interface only: the EDGE implementation is `EdgeProcessManager` in
 * `@dxos/edge-compute`.
 */
export interface Manager {
  readonly processTree: Effect.Effect<readonly Process.Info[]>;
  /**
   * Writable so {@link Manager.spawn} publishes into the same atom the aggregate `ProcessMonitor`
   * reads — otherwise a remote spawn is invisible in the process tree.
   */
  readonly processTreeAtom: Atom.Writable<readonly Process.Info[]>;

  /**
   * Cancels the current run of a remote (edge) trigger — its in-flight execution and `runAgain`
   * continuation chain; the trigger itself stays enabled so its schedule keeps firing. Optional:
   * absent in {@link layerNoop} (local-only deployments have no remote runtime to cancel on).
   */
  readonly cancel?: (target: CancelTarget) => Effect.Effect<void>;

  /**
   * Process control, when the remote host offers it. Absent in {@link layerNoop} and in managers
   * built without an edge client — a monitor-only manager can read and cancel but not spawn.
   */
  readonly control?: Control;

  /**
   * Spawn one of the host's processes and return a handle on it. Present exactly when
   * {@link control} is: a monitor-only manager can read and cancel but not spawn.
   *
   * Deliberately NOT a `ProcessManager.Manager`: a remote process is not a local one and consuming
   * code picks between the two itself (unifying them, where a caller wants that, belongs a layer
   * above — `AgentService` does it per session).
   */
  readonly spawn?: <_Input, _Output, _Rpcs extends Rpc.Any = never>(
    options: SpawnOptions<_Input, _Output, _Rpcs>,
  ) => Effect.Effect<ProcessManager.Handle<_Input, _Output, _Rpcs>>;

  /** Handles on the host's matching processes; metadata views until `Handle.hydrate` supplies a definition. */
  readonly list?: (options: ListOptions) => Effect.Effect<readonly ProcessManager.Handle.Any[]>;

  /** Handle on one process by id. */
  readonly attach?: (target: ProcessTarget) => Effect.Effect<ProcessManager.Handle.Any>;

  /**
   * Re-read the host's processes for a space into {@link processTreeAtom}. Needed at startup: the
   * host's processes outlive the client, so a fresh stack that started from an empty tree would
   * report nothing until the next spawn.
   */
  readonly refreshProcessTree?: (spaceId: SpaceId) => Effect.Effect<readonly Process.Info[]>;
}

/**
 * What {@link Manager.spawn} takes: the space to spawn in, the host's key for the process, and the
 * `ProcessManager.SpawnOptions` a remote host can honour.
 *
 * Only the `key` crosses the wire — the host resolves it against the processes it hosts — so a
 * definition is not what identifies a remote process. It supplies the input/output codecs and the
 * RPC group, which is the only reason it is accepted at all; without it the returned handle is a
 * metadata and lifecycle view whose typed surface throws until `Handle.hydrate` attaches one.
 */
export interface SpawnOptions<_Input = unknown, _Output = unknown, _Rpcs extends Rpc.Any = never> {
  readonly spaceId: SpaceId;
  readonly key: string;
  readonly definition?: Process.Process<_Input, _Output, any, _Rpcs>;
  readonly name?: string;
  readonly parentProcessId?: Process.ID;
  readonly environment?: Process.Environment;
  readonly target?: URI.URI;
  readonly notify?: Operation.NotifyOptions;
  readonly annotations?: Annotation.Dictionary;
}

/** {@link Manager.list} filters — `ListRequest` plus the one filter the host does not index. */
export interface ListOptions extends ListRequest {
  readonly parentProcessId?: Process.ID;
}

/**
 * The {@link Manager} verbs that need a {@link Control}, implemented once for every transport.
 *
 * Spread into a manager alongside its `control`, so a manager built without one simply lacks them
 * and a caller that needs to spawn remotely fails at the point it asks rather than silently.
 */
export const makeControlVerbs = (
  control: Control,
  registry: Registry.AtomRegistry,
  processTreeAtom: Atom.Writable<readonly Process.Info[]>,
): Required<Pick<Manager, 'spawn' | 'list' | 'attach' | 'refreshProcessTree'>> => {
  const refreshProcessTree = (spaceId: SpaceId): Effect.Effect<readonly Process.Info[]> =>
    control.list({ spaceId }).pipe(
      // A `Snapshot` IS a `Process.Info` (plus `alarmDueAt`), so the tree needs no projection.
      Effect.map((processes) => processes as readonly Process.Info[]),
      Effect.tap((tree) => Effect.sync(() => registry.update(processTreeAtom, () => tree))),
    );

  const makeHandle = <_Input, _Output, _Rpcs extends Rpc.Any>(
    spaceId: SpaceId,
    info: Snapshot,
    definition?: Process.Process<_Input, _Output, any, _Rpcs>,
  ): Effect.Effect<ProcessManager.Handle<_Input, _Output, _Rpcs>> =>
    RemoteProcessHandle.RemoteProcessHandle.make<_Input, _Output, _Rpcs>({
      info,
      control,
      spaceId,
      ...(definition !== undefined ? { definition } : {}),
      registry,
      onLifecycleChange: refreshProcessTree(spaceId).pipe(Effect.ignore, Effect.asVoid),
    });

  return {
    refreshProcessTree,

    spawn: <_Input, _Output, _Rpcs extends Rpc.Any = never>({
      spaceId,
      key,
      definition,
      name,
      parentProcessId,
      environment,
      target,
      notify,
      annotations: extraAnnotations,
    }: SpawnOptions<_Input, _Output, _Rpcs>) =>
      Effect.gen(function* () {
        const annotations = Annotation.buildDictionary((dictionary) => {
          if (target !== undefined) {
            Annotation.setDictionary(dictionary, Process.TargetAnnotation, target);
          }
          if (notify !== undefined) {
            Annotation.setDictionary(dictionary, Process.NotifyAnnotation, notify);
          }
          Object.assign(dictionary, extraAnnotations ?? {});
        });
        // Rejected here, where the caller's stack still names the annotation.
        assertJsonSafe(annotations);

        const info = yield* control.spawn({
          spaceId,
          key,
          ...(name !== undefined ? { name } : {}),
          ...(parentProcessId !== undefined ? { parentPid: parentProcessId } : {}),
          ...(environment !== undefined ? { environment } : {}),
          annotations,
        });
        log('remote process spawned', { pid: info.pid, key: info.key });
        // The process now exists on the host, so a later failure here would strand it: a caller that
        // retries would spawn a second one and never hold the first.
        const handle = yield* makeHandle<_Input, _Output, _Rpcs>(spaceId, info, definition).pipe(
          Effect.onError(() => control.terminate({ spaceId, pid: info.pid }).pipe(Effect.ignore)),
        );
        // The aggregate `Process.Monitor` reads the tree atom rather than calling this manager, so
        // the atom has to be current by the time spawn returns. Failing to read it back does not
        // invalidate the spawn.
        yield* refreshProcessTree(spaceId).pipe(Effect.ignore);
        return handle;
      }),

    list: ({ spaceId, key, target, state, parentProcessId }: ListOptions) =>
      control
        .list({
          spaceId,
          ...(key !== undefined ? { key } : {}),
          ...(target !== undefined ? { target } : {}),
          ...(state !== undefined ? { state } : {}),
        })
        .pipe(
          Effect.flatMap((processes) =>
            Effect.forEach(
              processes.filter(
                // `parentProcessId` has no server-side filter (the host indexes by key/target/state),
                // so it is applied here rather than silently ignored.
                (info) => parentProcessId === undefined || info.parentPid === parentProcessId,
              ),
              (info) => makeHandle(spaceId, info),
            ),
          ),
        ),

    attach: ({ spaceId, pid }: ProcessTarget) =>
      control.status({ spaceId, pid }).pipe(Effect.flatMap((info) => makeHandle(spaceId, info))),
  };
};

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

export class Service extends Context.Service<Service, Manager>()('@dxos/compute-runtime/RemoteProcessManager') {}

/**
 * Empty remote manager for local-only deployments.
 */
export const layerNoop: Layer.Layer<Service, never, Registry.AtomRegistry> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    const processTreeAtom = Atom.make<readonly Process.Info[]>([]);
    registry.mount(processTreeAtom);
    return {
      processTree: Effect.sync(() => registry.get(processTreeAtom)),
      processTreeAtom,
    } satisfies Manager;
  }),
);
