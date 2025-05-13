//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { DeckCapabilities } from './capabilities';
import { DeckLayout } from '../components';
import { DECK_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactRoot, {
    id: DECK_PLUGIN,
    root: () => {
      const layout = useCapability(DeckCapabilities.MutableDeckState);

      const handleDismissToast = useCallback(
        (id: string) => {
          const index = layout.toasts.findIndex((toast) => toast.id === id);
          if (index !== -1) {
            // Allow time for the toast to animate out.
            // TODO(burdon): Factor out and unregister timeout.
            setTimeout(() => {
              if (layout.toasts[index].id === layout.currentUndoId) {
                layout.currentUndoId = undefined;
              }
              layout.toasts.splice(index, 1);
            }, 1_000);
          }
        },
        [layout.toasts],
      );

      return <DeckLayout onDismissToast={handleDismissToast} />;
    },
  });
