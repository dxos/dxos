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

import * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';
import type { Annotation } from '@dxos/echo';
import type { SpaceId } from '@dxos/keys';
// `Process.Info.error` is already a `SerializedError`, so the snapshot and its exit event speak the
// same error shape as the domain type they extend.
import type { SerializedError } from '@dxos/protocols';

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
   * Writable so a `RemoteProcessManagerAdapter` built over {@link control} publishes into the same
   * atom the aggregate `ProcessMonitor` reads — otherwise a spawn through that façade is invisible
   * in the process tree.
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
}

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
