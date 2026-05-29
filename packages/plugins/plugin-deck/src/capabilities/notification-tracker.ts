//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capabilities, Capability } from '@dxos/app-framework';
import { type LayoutOperation } from '@dxos/app-toolkit';
import { type OperationInvoker } from '@dxos/operation';

import { meta } from '#meta';
import { DeckCapabilities } from '#types';

const NOTIFY_TOAST_DURATION = 5_000;
const ERROR_TOAST_DURATION = 10_000;
const UNDO_TOAST_DURATION = 10_000;

/**
 * Subscribes to the operation invocation stream and renders user-facing toasts. This is the single
 * producer of toasts driven by invocations: both per-invoke notifications (see
 * {@link OperationInvoker.InvocationEvent}'s `notify`) and undo toasts (for successful invocations whose
 * `status.undo` was stamped by the undo resolver).
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const ephemeralAtom = yield* Capability.get(DeckCapabilities.EphemeralState);
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);

    const addToast = (toast: LayoutOperation.Toast) => {
      const state = registry.get(ephemeralAtom);
      registry.set(ephemeralAtom, { ...state, toasts: [...state.toasts, toast] });
    };

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

    const handleEvent = (event: OperationInvoker.InvocationEvent) => {
      const { notify, status, invocationId } = event;
      switch (status.type) {
        case 'pending': {
          if (notify?.start) {
            addToast({ id: `notify-start-${invocationId}`, title: notify.start, duration: NOTIFY_TOAST_DURATION });
          }
          break;
        }
        case 'success': {
          if (notify?.success) {
            addToast({ id: `notify-success-${invocationId}`, title: notify.success, duration: NOTIFY_TOAST_DURATION });
          }
          if (status.undo) {
            showUndoToast(status.undo.message, invocationId);
          }
          break;
        }
        case 'failure': {
          if (notify?.error) {
            addToast({
              id: `notify-error-${invocationId}`,
              title: notify.error,
              description: status.error.message,
              icon: 'ph--warning--regular',
              duration: ERROR_TOAST_DURATION,
            });
          }
          break;
        }
      }
    };

    Effect.runFork(
      Stream.fromPubSub(invoker.invocations).pipe(
        Stream.runForEach((event) => Effect.sync(() => handleEvent(event))),
      ),
    );
  }),
);
