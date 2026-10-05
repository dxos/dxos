//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as Schema from 'effect/Schema';
import type * as Stream from 'effect/Stream';

import { Annotation, type Database } from '@dxos/echo';
import { type SpaceId, URI } from '@dxos/keys';
import type { SerializedError } from '@dxos/protocols';

import * as Operation from './Operation.ts';
import * as Trace from './Trace.ts';

//
// Process.
//

/** Opaque process id (arbitrary string). */
export const ID = Schema.String.pipe(Schema.brand('ProcessId'));
export type ID = Schema.Schema.Type<typeof ID>;

/**
 * Generic parameters for a all processes.
 */
export interface Params {
  /**
   * Process name for debugging purposes.
   */
  readonly name: string | null;

  /**
   * User-defined annotations for the process.
   * Can only be set when the process is spawned.
   */
  readonly annotations: Annotation.Dictionary;
}

/**
 * What the process is running on behalf of, fixed at spawn and inherited by child processes.
 *
 * Determines which services the runtime can provide (a space-scoped database, a conversation's harness).
 */
export interface Environment {
  /** Space the process is scoped to; absent for app-level work. */
  readonly space?: SpaceId;

  /** URI of the conversation feed (queue) the process is serving; absent outside a conversation. */
  readonly conversation?: URI.URI;
}

/**
 * Attaches the process to a target object.
 */
export const TargetAnnotation = Annotation.make({
  id: 'org.dxos.process.target',
  schema: URI.Schema,
});

/**
 * Notification descriptor for surfacing process lifecycle events to the user.
 */
export const NotifyAnnotation = Annotation.make({
  id: 'org.dxos.process.notify',
  schema: Operation.NotifyOptions,
});

/**
 * Marks a process as the harness host for its conversation (discovery substrate).
 */
export const HarnessHostAnnotation = Annotation.make({
  id: 'org.dxos.process.harnessHost',
  schema: Schema.Boolean,
});

/** Whether `info` is a conversation's agent process (stamped {@link HarnessHostAnnotation} at spawn). */
export const isHarnessHost = (info: Pick<Process, 'params'>): boolean =>
  Option.getOrElse(Annotation.getDictionary(info.params.annotations, HarnessHostAnnotation), () => false);

/**
 * Runtime state of a process.
 */
export enum State {
  // Command to spawn the process has been accepted locally but the runtime hosting it has not yet
  // acknowledged it. Only ever reported by a client queueing commands for a remote runtime
  // (`RemoteCommandQueue`); a process the local runtime owns is never in this state.
  STARTING = 'STARTING',

  // Process is actively running.
  RUNNING = 'RUNNING',

  // Process is waiting for a child process to complete or an alarm to trigger.
  HYBERNATING = 'HYBERNATING',

  // Process is waiting for input. It will only resume when input is submitted.
  IDLE = 'IDLE',

  // Process is terminating and will transition to TERMINATED state.
  // TODO(dmaretskyi): Consider removing.
  TERMINATING = 'TERMINATING',

  // Process has been externally terminated.
  TERMINATED = 'TERMINATED',

  // Process has completed successfully.
  SUCCEEDED = 'SUCCEEDED',

  // Process has failed.
  FAILED = 'FAILED',
}

/**
 * Read-only view of a process tree
 */
export interface Monitor {
  /**
   * Get the current state of the process tree.
   */
  processTree: Effect.Effect<readonly Process[]>;

  /**
   * Atom for the process tree.
   */
  processTreeAtom: Atom.Atom<readonly Process[]>;

  /**
   * The process tree narrowed by {@link MonitorFilter} — the read a caller looking for *its* process
   * wants, without reaching past this read-only surface into a manager.
   *
   * The aggregate monitor spans local and remote runtimes, so this answers "is my agent running,
   * wherever it runs" — which is what a UI renders and what a caller holding no handle can ask.
   */
  list(filter?: MonitorFilter): Effect.Effect<readonly Process[]>;

  /**
   * Stream ephemeral trace messages matching `filter` (DX-1125), sourced from local in-process
   * runtimes and remote runtimes broadcasting over the space swarm. Used to drive live progress UI.
   */
  subscribeToTraceMessages(filter: Trace.Filter): Stream.Stream<Trace.Message>;
}

/** Filters for {@link Monitor.list}; an absent field matches everything. */
export interface MonitorFilter {
  readonly key?: string;
  /** Target object the process was spawned against ({@link TargetAnnotation}). */
  readonly target?: URI.URI;
  readonly state?: State;
  /** Space from the process's {@link Environment}; a process with no space matches no space filter. */
  readonly space?: SpaceId;
  readonly parentPid?: ID | null;
}

/**
 * Whether `info` satisfies `filter`. Exported so every {@link Monitor} filters identically rather
 * than each implementation growing its own notion of a match.
 */
export const matchesFilter = (info: Process, filter: MonitorFilter = {}): boolean => {
  if (filter.key !== undefined && info.key !== filter.key) {
    return false;
  }
  if (filter.state !== undefined && info.state !== filter.state) {
    return false;
  }
  if (filter.space !== undefined && info.environment.space !== filter.space) {
    return false;
  }
  if (filter.parentPid !== undefined && info.parentPid !== filter.parentPid) {
    return false;
  }
  if (
    filter.target !== undefined &&
    Option.getOrUndefined(Annotation.getDictionary(info.params.annotations, TargetAnnotation)) !== filter.target
  ) {
    return false;
  }
  return true;
};

/** {@link Monitor.list} over a tree read, so a monitor implements it by supplying only that read. */
export const listFromTree =
  (processTree: Effect.Effect<readonly Process[]>) =>
  (filter?: MonitorFilter): Effect.Effect<readonly Process[]> =>
    Effect.map(processTree, (tree) => tree.filter((info) => matchesFilter(info, filter)));

export class ProcessMonitorService extends Context.Service<ProcessMonitorService, Monitor>()(
  '@dxos/functions/ProcessMonitorService',
) {}

/**
 * A process: one running (or finished) instance of a durable operation, wherever its runtime runs.
 */
export interface Process {
  readonly pid: ID;
  readonly parentPid: ID | null;

  /**
   * Key of the process.
   *
   * NOTE: There might be multiple running processes with the same key.
   */
  readonly key: string;

  /**
   * Parameters of the process.
   */
  readonly params: Params;

  /**
   * What the process is running on behalf of. See {@link Environment}.
   */
  readonly environment: Environment;

  /**
   * State of the process.
   */
  readonly state: State;

  /**
   * How the process failed as a serializable {@link SerializedError} (its `context` carries any
   * structured detail, e.g. a notify override), or `null` unless it is in FAILED state.
   */
  readonly error: SerializedError | null;

  /**
   * UNIX timestamp in milliseconds.
   */
  readonly startedAt: number;

  /**
   * UNIX timestamp in milliseconds.
   */
  readonly completedAt: Option.Option<number>;

  readonly metrics: {
    /**
     * Total wall time of all handler invocations of the process in milliseconds.
     */
    readonly wallTime: number;

    /**
     * Total number of inputs submitted to the process.
     */
    readonly inputCount: number;

    /**
     * Total number of outputs submitted to the process.
     */
    readonly outputCount: number;
  };
}

//
// Handle.
//

export interface Status {
  readonly state: State;
  readonly exit: Option.Option<Exit.Exit<void>>;

  readonly startedAt: Date;
  readonly completedAt: Option.Option<Date>;
}

export interface Handle<_Input, _Output, _Rpcs extends Rpc.Any> {
  readonly pid: ID;
  readonly parentId: ID | null;

  /**
   * Process definition key ({@link Operation.Durable.key}) for this process.
   */
  readonly key: string;

  /**
   * Parameters of the process.
   */
  readonly params: Params;

  /**
   * What the process is running on behalf of. See {@link Environment}.
   */
  readonly environment: Environment;

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
   * on dispose (see `ProcessOperationInvoker.fiberFromProcess` in `@dxos/compute-runtime`).
   */
  subscribeEphemeral(): Stream.Stream<Trace.Message>;

  terminate(): Effect.Effect<void>;
  readonly status: Status;

  /**
   * Absolute due-time (epoch ms) of the process's pending alarm, or `null` when none is scheduled.
   * A host that suspends the process between turns (a Durable Object) mirrors this onto its own
   * scheduler, since the runtime's alarm is an in-memory timer.
   */
  readonly alarmDueAt: number | null;
  statusAtom: Atom.Atom<Status>;

  /**
   * Resolves when the process reaches {@link State.IDLE} (nothing in-flight; waiting for input),
   * or a terminal state ({@link State.SUCCEEDED}, {@link State.TERMINATED}, {@link State.FAILED}).
   *
   * Does not resolve while the process is {@link State.HYBERNATING} (e.g. alarm pending or non-terminal child).
   * The effect keeps waiting until that external work finishes and the process becomes idle or terminal.
   *
   * If the process fails, this effect throws a defect.
   */
  runToCompletion(): Effect.Effect<void>;

  /**
   * Resolves when the process settles its current foreground turn: {@link State.IDLE} or
   * {@link State.SUCCEEDED}, or {@link State.HYBERNATING} with no pending alarm
   * (i.e. only background children remain in flight).
   *
   * Unlike {@link runToCompletion}, this does NOT wait for background children (e.g. delegated
   * sub-agents) to finish — so a supervisor's chat turn returns as soon as its reply is complete,
   * while sub-agents continue running and report back out of band. Still waits through
   * alarm-pending hybernation (more queued turn work). Defects on {@link State.FAILED}.
   */
  runUntilSettled(): Effect.Effect<void>;

  /**
   * Submits each input in order, then streams outputs until the process reaches {@link State.IDLE}
   * or {@link State.SUCCEEDED}. While {@link State.HYBERNATING}, keeps waiting for outputs
   * or a terminal state. The stream fails with a defect if the process reaches {@link State.FAILED}
   * or {@link State.TERMINATED}.
   */
  runAndExit(options: { readonly inputs: readonly _Input[] }): Stream.Stream<_Output>;

  /**
   * Hydrates a dormant persisted process using the supplied definition.
   * No-op when the handle is already live (returns self).
   */
  hydrate(definition: Operation.Durable<_Input, _Output, any, any>): Effect.Effect<Handle<_Input, _Output, _Rpcs>>;

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
  readonly parentProcessId?: ID;

  /**
   * Process name for debugging purposes.
   */
  readonly name?: string;

  /**
   * Target object that this process is assigned to.
   * Ergonomic shorthand folded into {@link TargetAnnotation} on the process annotations.
   */
  // TODO(dmaretskyi): Consider opaques metadata instead of opinionated `target` field.
  readonly target?: URI.URI;

  /**
   * Tracing metadata for this invocation.
   */
  readonly traceMeta?: Trace.Meta;

  readonly environment?: Environment;

  /**
   * Who the process's database writes are attributed to (see `Database.Origin`); also the origin of every process it
   * invokes. Persisted with the process, so a restored process keeps it.
   */
  readonly origin?: Database.Origin;

  /**
   * User-facing notifications requested for this process's lifecycle phases.
   * Ergonomic shorthand folded into {@link NotifyAnnotation} on the process annotations.
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
  readonly parentProcessId?: ID;

  /**
   * Filter processes by state.
   */
  readonly state?: State;

  /**
   * Filter processes by target object ID.
   */
  readonly target?: URI.URI;
}

//
// Manager.
//

/**
 * Where a process runs: in this runtime, or on EDGE.
 */
export type Location = 'local' | 'edge';

export interface ManagerSpawnOptions extends SpawnOptions {
  /** Defaults to `local`; `edge` requires `environment.space`, since EDGE hosts processes per space. */
  readonly location?: Location;
}

export interface ManagerListOptions extends ListOptions {
  /** Defaults to `local`. */
  readonly location?: Location;

  /** Space to list on EDGE; required when `location` is `edge`. */
  readonly space?: SpaceId;
}

export interface ManagerAttachOptions {
  /** Defaults to `local`. */
  readonly location?: Location;

  /** Space hosting the process on EDGE; required when `location` is `edge`. */
  readonly space?: SpaceId;
}

/**
 * Process control over every runtime a caller can address, chosen per call by {@link Location}.
 *
 * A caller that only knows where it wants a process to run uses this rather than picking between the
 * local and remote managers itself. Only the definition's key reaches EDGE, so an `edge` spawn
 * succeeds only for a key EDGE hosts; the definition still supplies the handle's codecs and RPC group.
 * Every verb dies when the requested location cannot be served (e.g. `edge` without EDGE process control).
 */
export interface Manager {
  spawn<I, O, Rpcs extends Rpc.Any = never>(
    definition: Operation.Durable<I, O, any, Rpcs>,
    options?: ManagerSpawnOptions,
  ): Effect.Effect<Handle<I, O, Rpcs>>;

  list(options?: ManagerListOptions): Effect.Effect<readonly Handle.Any[]>;

  attach(pid: ID, options?: ManagerAttachOptions): Effect.Effect<Handle.Any>;
}

export class ManagerService extends Context.Service<ManagerService, Manager>()('@dxos/compute/Process.Manager') {}

/**
 * New process is spawned.
 */
export const SpawnedEvent = Trace.EventType('process.spawned', {
  schema: Schema.Void,
  isEphemeral: false,
});

/**
 * Process has reached a terminal state.
 */
export const ExitedEvent = Trace.EventType('process.exited', {
  schema: Schema.Struct({
    outcome: Schema.Literals(['succeeded', 'failed', 'terminated']),
  }),
  isEphemeral: false,
});

/**
 * Renders spawned processes as a forest: top-level rows use "- ", nested rows use ├── / └── / │.
 */
export const prettyProcessTree = (tree: readonly Process[]): string => {
  if (tree.length === 0) {
    return '';
  }

  const pidSet = new Set(tree.map((node) => node.pid));
  const childrenByParent = new Map<string, Process[]>();
  const roots: Process[] = [];

  for (const node of tree) {
    const parent = node.parentPid;
    if (parent === null || !pidSet.has(parent)) {
      roots.push(node);
      continue;
    }
    const key = String(parent);
    const siblings = childrenByParent.get(key) ?? [];
    siblings.push(node);
    childrenByParent.set(key, siblings);
  }

  const byPid = (a: Process, b: Process) => String(a.pid).localeCompare(String(b.pid));
  roots.sort(byPid);
  for (const siblings of childrenByParent.values()) {
    siblings.sort(byPid);
  }

  const formatLabel = (node: Process): string => {
    const idShort = String(node.pid).slice(0, 6);
    const parts = [idShort, node.state];
    if (node.params.name != null && node.params.name !== '') {
      parts.push(node.params.name);
    }
    if (node.error != null) {
      parts.push(`(${node.error.message ?? node.error.name ?? 'error'})`);
    }
    const { inputCount, outputCount, wallTime } = node.metrics;
    parts.push(`[in:${inputCount} out:${outputCount} wall:${Math.round(wallTime)}ms]`);
    return parts.join(' ');
  };

  const lines: string[] = [];

  const walk = (node: Process, prefix: string, isLast: boolean, isRoot: boolean): void => {
    if (isRoot) {
      lines.push(`- ${formatLabel(node)}`);
    } else {
      const branch = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${branch}${formatLabel(node)}`);
    }

    const children = childrenByParent.get(String(node.pid)) ?? [];
    const nextPrefix = isRoot ? '  ' : `${prefix}${isLast ? '    ' : '│   '}`;
    children.forEach((child, index) => {
      walk(child, nextPrefix, index === children.length - 1, false);
    });
  };

  for (const root of roots) {
    walk(root, '', true, true);
  }

  return lines.join('\n');
};
