//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capability, Common } from '@dxos/app-framework';

import { DeckLayout } from '../../components';
import { useDeckState } from '../../hooks';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactRoot, {
      id: meta.id,
      root: () => {
        const { state, updateEphemeral } = useDeckState();

        const handleDismissToast = useCallback(
          (id: string) => {
            const index = state.toasts.findIndex((toast) => toast.id === id);
            if (index !== -1) {
              // Allow time for the toast to animate out.
              // TODO(burdon): Factor out and unregister timeout.
              setTimeout(() => {
                updateEphemeral((s) => {
                  const toastToRemove = s.toasts[index];
                  const newCurrentUndoId = toastToRemove?.id === s.currentUndoId ? undefined : s.currentUndoId;
                  return {
                    ...s,
                    currentUndoId: newCurrentUndoId,
                    toasts: s.toasts.filter((_, i) => i !== index),
                  };
                });
              }, 1_000);
            }
          },
          [state.toasts, updateEphemeral],
        );

        return <DeckLayout onDismissToast={handleDismissToast} />;
      },
    }),
  ),
);
