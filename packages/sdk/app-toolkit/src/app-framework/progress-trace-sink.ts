//
// Copyright 2026 DXOS.org
//

import { Trace } from '@dxos/compute';

import type * as AppCapabilities from './AppCapabilities';

/** Terminal status message — reducer calls `done()` then `remove()` on the keyed monitor. */
export const PROGRESS_STATUS_COMPLETE = 'progress.complete';

/** Terminal status message — reducer calls `fail()` and leaves the monitor visible. */
export const PROGRESS_STATUS_FAILED = 'Sync failed';

/** Terminal status message — reducer calls `note()` then `remove()`. */
export const PROGRESS_STATUS_CANCELLED = 'Cancelled';

type StatusPayload = Trace.PayloadType<typeof Trace.StatusUpdate>;
type ProgressMonitor = ReturnType<AppCapabilities.ProgressRegistry['register']>;

type MonitorEntry = {
  handle: ProgressMonitor;
  pid?: string;
};

export type ProgressTraceSinkOptions = {
  /** Terminates the process that emitted progress for a keyed monitor (wired from the process manager). */
  terminateProcess?: (pid: string) => void;
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

  const makeOnCancel = (key: string, pid: string) => () => {
    options.terminateProcess?.(pid);
    cancelMonitor(key);
  };

  const monitorFor = (
    registry: AppCapabilities.ProgressRegistry,
    key: string,
    label?: string,
    pid?: string,
  ) => {
    const existing = monitors.get(key);
    if (existing && existing.pid === pid) {
      return existing.handle;
    }

    const onCancel = pid && options.terminateProcess ? makeOnCancel(key, pid) : undefined;
    const handle = registry.register(key, { label, onCancel });
    monitors.set(key, { handle, pid });
    return handle;
  };

  const applyStatusUpdate = (data: StatusPayload, pid?: string) => {
    const key = data.progress?.key;
    if (!key) {
      return;
    }

    const registry = resolveRegistry();
    if (!registry) {
      return;
    }

    const handle = monitorFor(registry, key, data.message, pid);

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
      const pid = message.meta.pid;
      for (const event of Trace.flatten(message)) {
        if (Trace.isOfType(Trace.StatusUpdate, event)) {
          applyStatusUpdate(event.data, pid);
        }
      }
    },
  };
};
