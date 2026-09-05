//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useDeckState } from './useDeckState';

/**
 * Dismisses a toast by id. Shared by every root layout that renders the deck's toaster, since the
 * exit animation's timing is part of the contract rather than of any one layout.
 */
export const useDismissToast = (): ((id: string) => void) => {
  const { state, updateEphemeral } = useDeckState();

  return useCallback(
    (id: string) => {
      if (!state.toasts.some((toast) => toast.id === id)) {
        return;
      }
      // Allow time for the toast exit transition (`toast.css`, 150ms) before unmounting.
      // TODO(burdon): Factor out and unregister timeout.
      setTimeout(() => {
        // Re-resolve the toast by id inside the update: the toast list may have changed during
        // the delay, so a captured index would point at the wrong (or a missing) entry.
        updateEphemeral((s) => {
          const toastToRemove = s.toasts.find((toast) => toast.id === id);
          if (!toastToRemove) {
            return s;
          }
          const newCurrentUndoId = toastToRemove.id === s.currentUndoId ? undefined : s.currentUndoId;
          return {
            ...s,
            currentUndoId: newCurrentUndoId,
            toasts: s.toasts.filter((toast) => toast.id !== id),
          };
        });
      }, 150);
    },
    [state.toasts, updateEphemeral],
  );
};
