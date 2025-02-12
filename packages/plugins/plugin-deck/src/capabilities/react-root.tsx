//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Capabilities, contributes, useCapabilities, useCapability } from '@dxos/app-framework';

import { DeckCapabilities } from './capabilities';
import { DeckLayout } from '../components';
import { DECK_PLUGIN } from '../meta';
import { type DeckSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactRoot, {
    id: DECK_PLUGIN,
    root: () => {
      const layout = useCapability(DeckCapabilities.MutableDeckState);
      const settings = useCapability(Capabilities.SettingsStore).getStore<DeckSettingsProps>(DECK_PLUGIN)!.value;
      const panels = useCapabilities(DeckCapabilities.ComplementaryPanel);

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

      return (
        <DeckLayout
          showHints={settings.showHints}
          overscroll={settings.overscroll}
          panels={panels}
          onDismissToast={handleDismissToast}
        />
      );
    },
  });
