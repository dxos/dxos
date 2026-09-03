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
import type { ProcessProtocol } from '@dxos/protocols';

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
 * Full control surface for processes hosted by a remote runtime, mirroring the local
 * `ProcessManager.Manager`/`ProcessManager.Handle` verbs over the `ProcessProtocol` wire types.
 *
 * A remote host cannot be handed a process definition (it is a closure), so {@link spawn} names one
 * of the host's built-in processes by its `Process.key`.
 *
 * Effects carry no error channel, matching the local manager: transport and host failures surface as
 * defects.
 */
export interface Control {
  /** Spawn one of the host's built-in processes. */
  spawn(request: ProcessProtocol.SpawnProcessRequest): Effect.Effect<ProcessProtocol.ProcessInfo>;

  list(query?: ProcessProtocol.ListProcessesQuery): Effect.Effect<readonly ProcessProtocol.ProcessInfo[]>;

  status(pid: Process.ID): Effect.Effect<ProcessProtocol.ProcessInfo>;

  /** Submit an input already encoded via the process definition's input schema. */
  submitInput(pid: Process.ID, input: unknown): Effect.Effect<void>;

  /**
   * Build a client for the process's declared RPC group. The host serves the group as
   * effect-rpc-over-HTTP, so the returned client is a real {@link RpcClient.RpcClient} and the
   * transport (endpoint, credential, serialization) is the implementation's concern.
   */
  makeRpcClient<Rpcs extends Rpc.Any>(
    pid: Process.ID,
    group: RpcGroup.RpcGroup<Rpcs>,
  ): Effect.Effect<RpcClient.RpcClient<Rpcs>, never, Scope.Scope>;

  terminate(pid: Process.ID): Effect.Effect<void>;

  /**
   * Read the process's outputs and ephemeral trace at or after `cursor`. Cursor-based rather than
   * pushed so a client that reloads resumes an in-flight remote process where it left off.
   */
  readEvents(pid: Process.ID, cursor: number): Effect.Effect<ProcessProtocol.ProcessEventsResponse>;
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
