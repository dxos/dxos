//
// Copyright 2026 DXOS.org
//

import * as Trace from '@dxos/compute/Trace';
import { EID } from '@dxos/keys';

import type * as AppCapabilities from './AppCapabilities.ts';

/** Terminal status message — reducer calls `done()` then `remove()` on the keyed monitor. */
export const STATUS_COMPLETE = 'progress.complete';

/** Terminal status message — reducer calls `fail()` and leaves the monitor visible. */
export const STATUS_FAILED = 'Sync failed';

/** Terminal status message — reducer calls `note()` then `remove()`. */
export const STATUS_CANCELLED = 'Cancelled';

/**
 * Reason shown when a run stops reporting. Deliberately not "failed": the run may well have finished
 * or still be going — what is known is that its progress stopped arriving, and saying more than that
 * would be inventing an outcome.
 */
export const STATUS_STALLED = 'Stopped reporting';

/** A terminal status message ends a run — the reducer removes or fails the keyed monitor. */
const isTerminalMessage = (message: string | undefined): boolean =>
  message === STATUS_COMPLETE || message === STATUS_FAILED || message === STATUS_CANCELLED;

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
  /** Set once the run failed or stalled, so the next update starts a clean run rather than reviving a dead one. */
  ended?: boolean;
  /** Last phase index seen, so a change of phase can clear the count belonging to the old one. */
  phase?: number;
  /** Count and total the meter shows, so a continuation's numbers can be placed after them. */
  shown: { current?: number; total?: number };
  /**
   * What the chain had shown when a new pid took over, held until that pid's first count says whether
   * it restarted from zero; see {@link applyCounts}.
   */
  handover?: { current?: number; total?: number };
  /** Added to the count and total the current pid reports, once it turns out to count from zero. */
  offset?: number;
};

/**
 * A cancelled key's tombstone (see {@link TraceSinkOptions.cancelScope}). `pid` scope
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
 * How long after a pid's terminal its own non-terminal updates are taken as stragglers. Reordered
 * broadcasts trail by milliseconds; past this, a long-lived process reporting the same key again is a new run.
 */
const FINISHED_REORDER_WINDOW_MS = 10_000;

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

export type TraceSinkOptions = {
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
export type RegistrySource = AppCapabilities.ProgressRegistry | (() => AppCapabilities.ProgressRegistry | undefined);

/**
 * Builds a {@link Trace.Sink} that projects ephemeral `status.update` events into a
 * {@link AppCapabilities.ProgressRegistry}. Intended as a parallel sink alongside feed
 * persistence — operations emit trace status; this adapter drives UI monitors.
 *
 * When {@link RegistrySource} is a getter that returns `undefined`, status
 * updates are dropped until the registry becomes available.
 */
export const makeTraceSink = (progressRegistry: RegistrySource, options: TraceSinkOptions = {}): Trace.Sink => {
  const resolveRegistry = (): AppCapabilities.ProgressRegistry | undefined =>
    typeof progressRegistry === 'function' ? progressRegistry() : progressRegistry;

  const monitors = new Map<string, MonitorEntry>();
  // Keys the user cancelled, tombstoned so the dying run's tail (which keeps broadcasting until the
  // process/edge abort lands) cannot resurrect the removed monitor. Release is scoped so a genuinely
  // later run still shows — see {@link TraceSinkOptions.cancelScope}.
  const cancelled = new Map<string, Tombstone>();
  // The pid that last reported a terminal, per key: broadcasts can arrive out of order, so an update the
  // run sent before its terminal can land after it and must not reopen a meter nothing will close.
  const finished = new Map<string, { pid: string; at: number }>();

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
      // still be here. `ended` is what stops it from being mistaken for a live run.
      entry.stall = undefined;
      entry.ended = true;
      entry.handle.fail(STATUS_STALLED);
    }, stallTimeout);
  };

  const cancelMonitor = (key: string) => {
    const entry = monitors.get(key);
    if (!entry) {
      return;
    }
    entry.handle.note(STATUS_CANCELLED);
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
    if (existing && !existing.ended) {
      // Same run, new process — an EDGE continuation reports under a fresh pid. Re-registering here
      // would call `register`, which drops the prior entry so a genuine re-run starts clean, and the
      // total this run already reported would go with it: the meter falls back to a sweep mid-run,
      // having counted moments earlier. Keep the handle and re-point the target instead. The stall
      // timer carries over untouched — a continuation is the same run, so its clock keeps running.
      if (target.pid !== undefined && existing.target.pid !== undefined && target.pid !== existing.target.pid) {
        existing.handover = { ...existing.shown };
      }
      existing.target = target;
      return existing.handle;
    }

    // An ended monitor is not resumed in place: `register` drops the dead entry so the reviving run
    // starts from its own numbers and status, rather than inheriting the abandoned one's `current` or error.
    if (existing) {
      dropMonitor(key);
    }

    // Cancellable when a handler is wired and there is something to address — a local process (pid) or
    // an edge trigger (trigger); the handler routes local vs edge by runtime.
    const onCancel = options.cancelProcess && (target.pid || target.trigger) ? makeOnCancel(key) : undefined;
    const handle = registry.register(key, { label, onCancel });
    monitors.set(key, { handle, target, shown: {} });
    return handle;
  };

  /**
   * Applies an update's count and total, placed after the count earlier runs of the chain reached.
   *
   * A run that yields `Operation.runAgain()` continues under a new pid, and the meter is one meter for
   * the whole chain. A continuation that keeps counting where the last one stopped needs nothing. One
   * that restarts from zero (mail sync: each run counts the messages it fetches) would drag the bar back
   * to the start, so the count the chain reached is added to its count and its total. The first count
   * from the new pid tells the two apart. A run's total covers its own work and, when the producer can
   * estimate it, the work left after it, so the offset makes it the chain's total.
   *
   * On a restart the old total stays until the new run reports its own, so the bar holds its place
   * between runs. Unless the chain had reached it: a total that only covered the finished batch would
   * read as complete, so it goes back to unknown instead.
   */
  const applyCounts = (entry: MonitorEntry, progress: { current?: number; total?: number }) => {
    const { handover } = entry;
    if (handover && progress.current !== undefined) {
      entry.handover = undefined;
      const reached = handover.current ?? 0;
      if (progress.current < reached) {
        entry.offset = reached;
        if (handover.total === undefined || reached >= handover.total) {
          entry.shown.total = undefined;
          entry.handle.total(undefined);
        }
      } else {
        entry.offset = undefined;
      }
    }

    const offset = entry.offset ?? 0;
    if (progress.total !== undefined) {
      entry.shown.total = offset + progress.total;
      entry.handle.total(entry.shown.total);
    }
    if (progress.current !== undefined) {
      entry.shown.current = offset + progress.current;
      entry.handle.set(entry.shown.current);
    }
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

    const terminal = isTerminalMessage(data.message);
    const ended = finished.get(key);
    if (
      !terminal &&
      ended !== undefined &&
      ended.pid === target.pid &&
      Date.now() - ended.at <= FINISHED_REORDER_WINDOW_MS
    ) {
      return;
    }
    if (terminal && target.pid !== undefined) {
      finished.set(key, { pid: target.pid, at: Date.now() });
    }

    const handle = monitorFor(registry, key, data.message, target);

    if (data.message === STATUS_FAILED) {
      // Stays registered so the meter can show it, but the clock stops: a stall firing over a
      // reported failure would replace the producer's reason with a guess about silence.
      disarmStall(key);
      handle.fail(STATUS_FAILED);
      const entry = monitors.get(key);
      if (entry) {
        entry.ended = true;
      }
      return;
    }

    if (data.message === STATUS_CANCELLED) {
      handle.note(STATUS_CANCELLED);
      handle.remove();
      dropMonitor(key);
      return;
    }

    if (data.message === STATUS_COMPLETE) {
      handle.done();
      handle.remove();
      dropMonitor(key);
      return;
    }

    const entry = monitors.get(key);

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
      if (entry && data.progress.phase !== undefined && data.progress.phase !== entry.phase) {
        entry.phase = data.progress.phase;
        // The chain offset is a count too, and it belongs to the phase that is ending.
        entry.shown = {};
        entry.offset = undefined;
        entry.handover = undefined;
        handle.total(undefined);
        handle.set(0);
      }
    }
    if (entry) {
      applyCounts(entry, data.progress);
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
