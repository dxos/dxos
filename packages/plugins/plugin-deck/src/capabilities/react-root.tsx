//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';

import { DeckLayout } from '#containers';
import { useDeckState } from '#hooks';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactRoot, {
      id: meta.profile.key,
      root: () => {
        const { state, updateEphemeral } = useDeckState();

        const handleDismissToast = useCallback(
          (id: string) => {
            if (!state.toasts.some((toast) => toast.id === id)) {
              return;
            }
            // Allow time for the toast exit animation (animate-toast-hide, 100ms) before unmounting.
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

        return <DeckLayout onDismissToast={handleDismissToast} />;
      },
    }),
  ),
);
