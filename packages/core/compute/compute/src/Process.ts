//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import type * as Stream from 'effect/Stream';

import { Annotation } from '@dxos/echo';
import { type SpaceId, URI } from '@dxos/keys';
import type { SerializedError } from '@dxos/protocols';

import * as Operation from './Operation.ts';
import * as Trace from './Trace.ts';

export { RUN_AGAIN_ERROR_CODE, RUN_AGAIN_MESSAGE, RunAgainError } from './errors.ts';

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
