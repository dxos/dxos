//
// Copyright 2026 DXOS.org
//

import * as Trace from '@dxos/compute/Trace';
import { EID } from '@dxos/keys';

import type * as AppCapabilities from './AppCapabilities';

/** Terminal status message — reducer calls `done()` then `remove()` on the keyed monitor. */
export const PROGRESS_STATUS_COMPLETE = 'progress.complete';

/** Terminal status message — reducer calls `fail()` and leaves the monitor visible. */
export const PROGRESS_STATUS_FAILED = 'Sync failed';

/** Terminal status message — reducer calls `note()` then `remove()`. */
export const PROGRESS_STATUS_CANCELLED = 'Cancelled';

/**
 * Reason shown when a run stops reporting. Deliberately not "failed": the run may well have finished
 * or still be going — what is known is that its progress stopped arriving, and saying more than that
 * would be inventing an outcome.
 */
export const PROGRESS_STATUS_STALLED = 'Stopped reporting';

/** A terminal status message ends a run — the reducer removes or fails the keyed monitor. */
const isTerminalMessage = (message: string | undefined): boolean =>
  message === PROGRESS_STATUS_COMPLETE || message === PROGRESS_STATUS_FAILED || message === PROGRESS_STATUS_CANCELLED;

type StatusPayload = Trace.PayloadType<typeof Trace.StatusUpdate>;
type ProgressMonitor = ReturnType<AppCapabilities.ProgressRegistry['register']>;

/**
 * Identifies the process/trigger that emits a monitor's progress, carried from the trace message's
 * {@link Trace.Meta} so a cancel can be routed to the right runtime — a local process (`pid`) or an
 * edge trigger (`trigger` + `space`, when `runtimeName` is an edge runtime).
 */
export type CancelTarget = {
  pid?: string;
  space?: string;
  runtimeName?: Trace.RuntimeName;
  trigger?: Trace.Meta['trigger'];
};

/**
 * The trigger's object id from a {@link CancelTarget}, parsed from the trigger ref's `echo:` URI — the
 * key an edge trigger cancel is addressed by. Undefined when there is no trigger or it is not an echo
 * reference (e.g. a type ref).
 */
export const resolveTriggerId = (target: CancelTarget): string | undefined => {
  if (!target.trigger) {
    return undefined;
  }
  const eid = EID.tryParse(target.trigger.uri);
  return eid ? EID.getEntityId(eid) : undefined;
};

type MonitorEntry = {
  handle: ProgressMonitor;
  target: CancelTarget;
  /** Fires when this monitor has gone `stallTimeout` without an update; re-armed by every update. */
  stall?: ReturnType<typeof setTimeout>;
  /** Set once the stall fired, so the next update starts a clean run rather than reviving a dead one. */
  stalled?: boolean;
  /** Last phase index seen, so a change of phase can clear the count belonging to the old one. */
  phase?: number;
};

/**
 * A cancelled key's tombstone (see {@link ProgressTraceSinkOptions.cancelScope}). `pid` scope
 * releases when a different pid arrives (the next local run); `run` scope releases on the run's
 * terminal status (an edge chain spans many pids, so pid identity cannot bound it).
 */
type Tombstone = { scope: 'pid'; pid: string } | { scope: 'run'; at: number };

/**
 * Backstop for a `run`-scoped tombstone whose releasing terminal never arrives — the emitting
 * runtime's terminal broadcast is fire-and-forget, so a dropped publish must cost a late meter
 * rather than a permanently suppressed one. Well under a sync trigger's schedule.
 */
const RUN_TOMBSTONE_TTL_MS = 60_000;

/**
 * How long a monitor may go without a status update before the sink stops believing in it.
 *
 * Every terminal the producer can emit travels the same lossy path its progress does — a killed
 * process runs no finalizer, an Effect defect escapes the error channel that would report one, and a
 * swarm broadcast is fire-and-forget. Without a bound here any of those pins a meter open forever,
 * which is a worse failure than a late one: an indefinite sweep claims work is happening. Chosen well
 * above the gap between a run's own updates (mail sync reports per enumerated page) and well below a
 * sync trigger's schedule.
 */
const DEFAULT_STALL_TIMEOUT_MS = 90_000;

export type ProgressTraceSinkOptions = {
  /** Cancels the process/trigger that emitted progress for a keyed monitor (wired from the process manager). */
  cancelProcess?: (target: CancelTarget) => void;
  /**
   * How a cancel tombstone bounds "the cancelled run" so its dying tail cannot resurrect the meter
   * while a genuinely later run still can. `pid` (default) suits a local process — one pid per run,
   * released by a different pid; `run` suits an edge trigger, whose run is a chain of bounded
   * invocations each with a fresh pid, so the key is suppressed until the run's terminal status.
   */
  cancelScope?: 'pid' | 'run';
  /**
   * Milliseconds a monitor may go without a status update before it is failed as stalled; see
   * {@link DEFAULT_STALL_TIMEOUT_MS}. Non-positive or non-finite disables the bound, which leaves a
   * lost terminal pinning its meter open — only appropriate where the producer is in-process and its
   * terminal cannot be lost.
   */
  stallTimeout?: number;
};

/**
 * Progress registry, or a getter that resolves it lazily.
 *
 * A getter lets the sink activate during SetupProcessManager (before
 * ProgressRegistry is contributed on Startup) without deadlocking.
 */
export type ProgressRegistrySource =
  | AppCapabilities.ProgressRegistry
  | (() => AppCapabilities.ProgressRegistry | undefined);

/**
 * Builds a {@link Trace.Sink} that projects ephemeral `status.update` events into a
 * {@link AppCapabilities.ProgressRegistry}. Intended as a parallel sink alongside feed
 * persistence — operations emit trace status; this adapter drives UI monitors.
 *
 * When {@link ProgressRegistrySource} is a getter that returns `undefined`, status
 * updates are dropped until the registry becomes available.
 */
export const createProgressTraceSink = (
  progressRegistry: ProgressRegistrySource,
  options: ProgressTraceSinkOptions = {},
): Trace.Sink => {
  const resolveRegistry = (): AppCapabilities.ProgressRegistry | undefined =>
    typeof progressRegistry === 'function' ? progressRegistry() : progressRegistry;

  const monitors = new Map<string, MonitorEntry>();
  // Keys the user cancelled, tombstoned so the dying run's tail (which keeps broadcasting until the
  // process/edge abort lands) cannot resurrect the removed monitor. Release is scoped so a genuinely
  // later run still shows — see {@link ProgressTraceSinkOptions.cancelScope}.
  const cancelled = new Map<string, Tombstone>();

  const stallTimeout = options.stallTimeout ?? DEFAULT_STALL_TIMEOUT_MS;
  const stallBounded = Number.isFinite(stallTimeout) && stallTimeout > 0;

  /** Stop the silence clock without forgetting the monitor — a run that reported its own end. */
  const disarmStall = (key: string) => {
    const entry = monitors.get(key);
    if (entry?.stall) {
      clearTimeout(entry.stall);
      entry.stall = undefined;
    }
  };

  const dropMonitor = (key: string) => {
    disarmStall(key);
    monitors.delete(key);
  };

  /**
   * (Re)start the silence clock for a live monitor. Armed from the reducer rather than from
   * `monitorFor`, so it measures the gap between UPDATES — arming only at registration would fail a
   * long but healthy run.
   */
  const armStall = (key: string) => {
    if (!stallBounded) {
      return;
    }
    const entry = monitors.get(key);
    if (!entry) {
      return;
    }
    if (entry.stall) {
      clearTimeout(entry.stall);
    }
    entry.stall = setTimeout(() => {
      // The entry stays in the map: the meter shows the failure with its dismiss control, and that
      // control routes through `makeOnCancel` → `cancelMonitor`, both of which need the entry to
      // still be here. `stalled` is what stops it from being mistaken for a live run.
      entry.stall = undefined;
      entry.stalled = true;
      entry.handle.fail(PROGRESS_STATUS_STALLED);
    }, stallTimeout);
  };

  const cancelMonitor = (key: string) => {
    const entry = monitors.get(key);
    if (!entry) {
      return;
    }
    entry.handle.note(PROGRESS_STATUS_CANCELLED);
    entry.handle.remove();
    dropMonitor(key);
  };

  // Reads the target when cancel is pressed, not when the monitor was registered: a run reporting
  // from a new process updates the stored target in place (see `monitorFor`), and a handler bound to
  // the target it first saw would cancel a process that is no longer doing the work.
  const makeOnCancel = (key: string) => () => {
    const target = monitors.get(key)?.target ?? {};
    if (options.cancelScope === 'run') {
      cancelled.set(key, { scope: 'run', at: Date.now() });
    } else if (target.pid) {
      cancelled.set(key, { scope: 'pid', pid: target.pid });
    }
    options.cancelProcess?.(target);
    cancelMonitor(key);
  };

  const monitorFor = (
    registry: AppCapabilities.ProgressRegistry,
    key: string,
    label: string | undefined,
    target: CancelTarget,
  ) => {
    const existing = monitors.get(key);
    if (existing && !existing.stalled) {
      // Same run, new process — an EDGE continuation reports under a fresh pid. Re-registering here
      // would call `register`, which drops the prior entry so a genuine re-run starts clean, and the
      // total this run already reported would go with it: the meter falls back to a sweep mid-run,
      // having counted moments earlier. Keep the handle and re-point the target instead. The stall
      // timer carries over untouched — a continuation is the same run, so its clock keeps running.
      existing.target = target;
      return existing.handle;
    }

    // A stalled monitor is not resumed in place: `register` drops the dead entry so the reviving run
    // starts from its own numbers, rather than inheriting a `current` the abandoned one left behind.
    if (existing) {
      dropMonitor(key);
    }

    // Cancellable when a handler is wired and there is something to address — a local process (pid) or
    // an edge trigger (trigger); the handler routes local vs edge by runtime.
    const onCancel = options.cancelProcess && (target.pid || target.trigger) ? makeOnCancel(key) : undefined;
    const handle = registry.register(key, { label, onCancel });
    monitors.set(key, { handle, target });
    return handle;
  };

  const applyStatusUpdate = (data: StatusPayload, target: CancelTarget) => {
    const key = data.progress?.key;
    if (!key) {
      return;
    }

    const registry = resolveRegistry();
    if (!registry) {
      return;
    }

    const tombstone = cancelled.get(key);
    if (tombstone) {
      if (tombstone.scope === 'run') {
        // Suppress the whole cancelled run (any pid in its chain) until its terminal status, which
        // is itself suppressed — the monitor was already removed on cancel. Past the TTL the
        // suppression lifts regardless, so a lost terminal cannot hide every later run.
        if (isTerminalMessage(data.message)) {
          cancelled.delete(key);
          return;
        }
        if (Date.now() - tombstone.at <= RUN_TOMBSTONE_TTL_MS) {
          return;
        }
        cancelled.delete(key);
      } else if (target.pid === tombstone.pid) {
        // `pid` scope: the cancelled run's tail shares its pid; a different pid is the next run.
        return;
      } else {
        cancelled.delete(key);
      }
    }

    const handle = monitorFor(registry, key, data.message, target);

    if (data.message === PROGRESS_STATUS_FAILED) {
      // Stays registered so the meter can show it, but the clock stops: a stall firing over a
      // reported failure would replace the producer's reason with a guess about silence.
      disarmStall(key);
      handle.fail(PROGRESS_STATUS_FAILED);
      return;
    }

    if (data.message === PROGRESS_STATUS_CANCELLED) {
      handle.note(PROGRESS_STATUS_CANCELLED);
      handle.remove();
      dropMonitor(key);
      return;
    }

    if (data.message === PROGRESS_STATUS_COMPLETE) {
      handle.done();
      handle.remove();
      dropMonitor(key);
      return;
    }

    // The plan first: a phase change resets the item count, so applying it after `set` would discard
    // the very total/current this update carries.
    if (data.progress.phases !== undefined || data.progress.phase !== undefined) {
      handle.plan({ phases: data.progress.phases, phase: data.progress.phase });
      // A count belongs to the phase that reported it, so entering a new phase clears it — otherwise
      // an uncountable phase inherits its predecessor's numbers and draws a determinate bar over work
      // it cannot measure. The producer says so by sending no total, but `total` is an optional field:
      // an explicit `undefined` and an absent one are the same bytes on the wire, so the phase change
      // is the only signal that survives. `plan` deliberately does not reset (it must not discard the
      // numbers THIS update carries), which is why the reset is here — before they are applied.
      const entry = monitors.get(key);
      if (entry && data.progress.phase !== undefined && data.progress.phase !== entry.phase) {
        entry.phase = data.progress.phase;
        handle.total(undefined);
        handle.set(0);
      }
    }
    if (data.progress.total !== undefined) {
      handle.total(data.progress.total);
    }
    if (data.progress.current !== undefined) {
      handle.set(data.progress.current);
    }
    if (data.progress.estimate !== undefined) {
      handle.estimate(data.progress.estimate);
    }

    // Last, and only for a non-terminal update: this update is the proof of life the clock measures from.
    armStall(key);
  };

  return {
    write: (message) => {
      const { pid, space, runtimeName, trigger } = message.meta;
      const target: CancelTarget = { pid, space, runtimeName, trigger };
      for (const event of Trace.flatten(message)) {
        if (Trace.isOfType(Trace.StatusUpdate, event)) {
          applyStatusUpdate(event.data, target);
        }
      }
    },
  };
};
