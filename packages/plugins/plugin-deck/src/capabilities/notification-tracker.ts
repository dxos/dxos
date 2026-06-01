//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capabilities, Capability } from '@dxos/app-framework';
import { type LayoutOperation } from '@dxos/app-toolkit';
import { Process } from '@dxos/compute';
import { type OperationInvoker } from '@dxos/operation';

import { meta } from '#meta';
import { DeckCapabilities } from '#types';

const NOTIFY_TOAST_DURATION = 5_000;
const ERROR_TOAST_DURATION = 10_000;
const UNDO_TOAST_DURATION = 10_000;

/**
 * The single producer of toasts driven by operation invocations:
 * - Per-invoke notifications ride the process monitor: each invocation spawns a process carrying the
 *   caller's `notify` config on its params; this tracker watches process state transitions and toasts
 *   on start / success / failure.
 * - Undo toasts come from the invocation stream's `status.undo` (which needs input/output the monitor
 *   doesn't carry) and are wired to the history tracker.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const ephemeralAtom = yield* Capability.get(DeckCapabilities.EphemeralState);
    const monitor = yield* Capability.get(Capabilities.ProcessMonitor);
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);

    const addToast = (toast: LayoutOperation.Toast) => {
      const state = registry.get(ephemeralAtom);
      registry.set(ephemeralAtom, { ...state, toasts: [...state.toasts, toast] });
    };

    //
    // Notifications — driven by the process monitor.
    //

    // Tracks the last-seen state per process so we only toast on transitions.
    const lastState = new Map<Process.ID, Process.State>();

    const handleProcesses = (processes: readonly Process.Info[]) => {
      const seen = new Set<Process.ID>();
      for (const process of processes) {
        seen.add(process.pid);
        const previous = lastState.get(process.pid);
        lastState.set(process.pid, process.state);
        if (previous === process.state) {
          continue;
        }

        const notify = process.params.notify;
        if (!notify) {
          continue;
        }

        // First time we observe the process running.
        if (previous === undefined && process.state === Process.State.RUNNING && notify.start) {
          addToast({ id: `notify-start-${process.pid}`, title: notify.start, duration: NOTIFY_TOAST_DURATION });
        } else if (process.state === Process.State.SUCCEEDED && notify.success) {
          addToast({ id: `notify-success-${process.pid}`, title: notify.success, duration: NOTIFY_TOAST_DURATION });
        } else if (process.state === Process.State.FAILED && notify.error) {
          addToast({
            id: `notify-error-${process.pid}`,
            title: notify.error,
            ...(process.error ? { description: process.error } : {}),
            icon: 'ph--warning--regular',
            duration: ERROR_TOAST_DURATION,
          });
        }
      }

      // Drop bookkeeping for processes that have left the tree.
      for (const pid of lastState.keys()) {
        if (!seen.has(pid)) {
          lastState.delete(pid);
        }
      }
    };

    // Subscription lives for the lifetime of the capability (app lifetime), like the invocation stream below.
    registry.subscribe(monitor.processTreeAtom, handleProcesses);

    //
    // Undo — driven by the invocation stream (`status.undo` carries the message + inverse).
    //

    const showUndoToast = (message: LayoutOperation.Toast['title'], invocationId: string) => {
      const undoId = `notify-undo-${invocationId}`;
      const state = registry.get(ephemeralAtom);
      // Replace the previous undo toast (only the most recent action can be undone).
      const toasts = state.currentUndoId
        ? state.toasts.filter((toast) => toast.id !== state.currentUndoId)
        : state.toasts;
      const toast: LayoutOperation.Toast = {
        id: undoId,
        title: message ?? ['undo-available.label', { ns: meta.id }],
        duration: UNDO_TOAST_DURATION,
        actionLabel: ['undo-action.label', { ns: meta.id }],
        actionAlt: ['undo-action.alt', { ns: meta.id }],
        closeLabel: ['undo-close.label', { ns: meta.id }],
        onAction: () => {
          // Resolve lazily to avoid an activation-ordering race with the history capability.
          const historyTracker = capabilities.getAll(Capabilities.HistoryTracker)[0];
          void historyTracker?.undoPromise();
        },
      };
      registry.set(ephemeralAtom, { ...state, currentUndoId: undoId, toasts: [...toasts, toast] });
    };

    const handleInvocation = (event: OperationInvoker.InvocationEvent) => {
      if (event.status.type === 'success' && event.status.undo) {
        showUndoToast(event.status.undo.message, event.invocationId);
      }
    };

    Effect.runFork(
      Stream.fromPubSub(invoker.invocations).pipe(
        Stream.runForEach((event) => Effect.sync(() => handleInvocation(event))),
      ),
    );
  }),
);
