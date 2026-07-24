//
// Copyright 2026 DXOS.org
//

import { Trace } from '@dxos/compute';
import { EID } from '@dxos/keys';

import type * as AppCapabilities from './AppCapabilities';

/** Terminal status message — reducer calls `done()` then `remove()` on the keyed monitor. */
export const PROGRESS_STATUS_COMPLETE = 'progress.complete';

/** Terminal status message — reducer calls `fail()` and leaves the monitor visible. */
export const PROGRESS_STATUS_FAILED = 'Sync failed';

/** Terminal status message — reducer calls `note()` then `remove()`. */
export const PROGRESS_STATUS_CANCELLED = 'Cancelled';

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
};

/**
 * A cancelled key's tombstone (see {@link ProgressTraceSinkOptions.cancelScope}). `pid` scope
 * releases when a different pid arrives (the next local run); `run` scope releases on the run's
 * terminal status (an edge chain spans many pids, so pid identity cannot bound it).
 */
type Tombstone = { scope: 'pid'; pid: string } | { scope: 'run' };

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

  const dropMonitor = (key: string) => {
    monitors.delete(key);
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

  const makeOnCancel = (key: string, target: CancelTarget) => () => {
    if (options.cancelScope === 'run') {
      cancelled.set(key, { scope: 'run' });
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
    if (existing && existing.target.pid === target.pid) {
      return existing.handle;
    }

    // Cancellable when a handler is wired and there is something to address — a local process (pid) or
    // an edge trigger (trigger); the handler routes local vs edge by runtime.
    const onCancel = options.cancelProcess && (target.pid || target.trigger) ? makeOnCancel(key, target) : undefined;
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
        // Suppress the whole cancelled run (any pid in its chain); the run's terminal status
        // releases the tombstone so a later run re-shows. The terminal is itself suppressed — the
        // monitor was already removed on cancel.
        if (isTerminalMessage(data.message)) {
          cancelled.delete(key);
        }
        return;
      }
      // `pid` scope: the cancelled run's tail shares its pid; a different pid is the next run.
      if (target.pid === tombstone.pid) {
        return;
      }
      cancelled.delete(key);
    }

    const handle = monitorFor(registry, key, data.message, target);

    if (data.message === PROGRESS_STATUS_FAILED) {
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

    if (data.progress.total !== undefined) {
      handle.total(data.progress.total);
    }
    if (data.progress.current !== undefined) {
      handle.set(data.progress.current);
    }
    if (data.progress.estimate !== undefined) {
      handle.estimate(data.progress.estimate);
    }
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
