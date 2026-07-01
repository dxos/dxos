//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Capabilities, Capability, type PluginManager } from '@dxos/app-framework';
import { type LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { Process } from '@dxos/compute';
import { Annotation } from '@dxos/echo';

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
 * - Undo toasts come from the history tracker's `undoable` stream (it owns the undo registry lookup);
 *   the toast action triggers `historyTracker.undoPromise()`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const ephemeralAtom = yield* Capability.get(DeckCapabilities.EphemeralState);
    const monitor = yield* Capability.get(Capabilities.ProcessMonitor);
    const manager = yield* Capability.get(Capabilities.PluginManager);
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

        const notify = Option.getOrNull(Annotation.getDictionary(process.params.annotations, Process.NotifyAnnotation));
        if (!notify) {
          continue;
        }

        // Transition into RUNNING (the first snapshot may be a pre-RUNNING state like IDLE/HYBERNATING).
        if (previous !== Process.State.RUNNING && process.state === Process.State.RUNNING && notify.start) {
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

    const unsubscribeMonitor = registry.subscribe(monitor.processTreeAtom, handleProcesses);

    //
    // Plugin failures — show one toast when any plugin fails to activate, with a link to the registry.
    //

    let hasShownFailureToast = false;

    const handleFailures = (failures: readonly PluginManager.PluginFailure[]) => {
      if (failures.length === 0) {
        hasShownFailureToast = false;
        return;
      }
      if (hasShownFailureToast) {
        return;
      }
      hasShownFailureToast = true;
      // Replace any stale plugin-failure toast so at most one is ever visible.
      const toast: LayoutOperation.Toast = {
        id: 'plugin-failure',
        title: ['plugin-failure.title', { ns: meta.profile.key }],
        description: ['plugin-failure.description', { ns: meta.profile.key }],
        icon: 'ph--warning--regular',
        duration: ERROR_TOAST_DURATION,
        actionLabel: ['plugin-failure-action.label', { ns: meta.profile.key }],
        actionAlt: ['plugin-failure-action.alt', { ns: meta.profile.key }],
        onAction: () => void invoker.invokePromise(SettingsOperation.OpenPluginRegistry),
      };
      const state = registry.get(ephemeralAtom);
      registry.set(ephemeralAtom, {
        ...state,
        toasts: [...state.toasts.filter((t) => t.id !== 'plugin-failure'), toast],
      });
    };

    const unsubscribeFailures = registry.subscribe(manager.failed, handleFailures);

    //
    // Undo — driven by the history tracker's `undoable` stream (it owns the registry lookup).
    //

    const showUndoToast = (message: LayoutOperation.Toast['title'], onUndo: () => void) => {
      const undoId = `notify-undo-${crypto.randomUUID()}`;
      const state = registry.get(ephemeralAtom);
      // Replace the previous undo toast (only the most recent action can be undone).
      const toasts = state.currentUndoId
        ? state.toasts.filter((toast) => toast.id !== state.currentUndoId)
        : state.toasts;
      const toast: LayoutOperation.Toast = {
        id: undoId,
        title: message ?? ['undo-available.label', { ns: meta.profile.key }],
        duration: UNDO_TOAST_DURATION,
        actionLabel: ['undo-action.label', { ns: meta.profile.key }],
        actionAlt: ['undo-action.alt', { ns: meta.profile.key }],
        closeLabel: ['undo-close.label', { ns: meta.profile.key }],
        onAction: onUndo,
      };
      registry.set(ephemeralAtom, { ...state, currentUndoId: undoId, toasts: [...toasts, toast] });
    };

    // The history tracker is contributed on ProcessManagerReady, possibly after this module activates;
    // `waitFor` resolves it once available, then we observe its undoable stream.
    const undoFiber = Effect.runFork(
      Effect.gen(function* () {
        const historyTracker = yield* Capability.waitFor(Capabilities.HistoryTracker);
        yield* Stream.fromPubSub(historyTracker.undoable).pipe(
          Stream.runForEach((event) =>
            Effect.sync(() => showUndoToast(event.message, () => void historyTracker.undoPromise())),
          ),
        );
      }).pipe(Effect.provideService(Capability.Service, capabilities)),
    );

    // Track all subscriptions so they are torn down when the module deactivates.
    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.gen(function* () {
        unsubscribeMonitor();
        unsubscribeFailures();
        yield* Fiber.interrupt(undoFiber);
      }),
    );
  }),
);
