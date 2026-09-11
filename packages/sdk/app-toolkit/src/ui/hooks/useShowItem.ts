//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';

import { LayoutOperation } from '../../operations/index.ts';
import { useLayout } from './useLayout.ts';

export type ShowItemOptions = {
  /** Attention context id — typically the master surface's attendableId. */
  contextId: string;
  /** Id of the item being made the current selection in that context. */
  selectionId: string;
  /** Companion segment target, e.g. `linkedSegment('message')`. */
  companion: string;
  /**
   * Navigation path used only in the deck's layout modes. Omit to fall back to
   * companion behavior.
   */
  path?: string;
};

/**
 * Master-detail dispatch helper. Selects the item in the attention context,
 * then — based on the current layout mode — shows its detail surface:
 *
 * - `'mobile'`: expand the complementary sidebar on the given companion segment.
 * - deck modes (`'solo'`/`'multi'`): open the item as a sibling plank beside the master
 *   (`pivotId = contextId`), when a `path` is provided.
 * - otherwise: swap the current plank's companion to the given segment.
 */
export const useShowItem = () => {
  const { invokePromise } = useOperationInvoker();
  const layout = useLayout();

  return useCallback(
    async ({ contextId, selectionId, companion, path }: ShowItemOptions) => {
      await invokePromise(LayoutOperation.Select, {
        contextId,
        subject: { mode: 'single', id: selectionId },
      });

      // `mode` carries both the layout's platform (`mobile`) and the deck's own mode, so every deck
      // mode — whatever the plank count — opens the detail beside its master.
      switch (layout.mode) {
        case 'mobile':
          return invokePromise(LayoutOperation.UpdateComplementary, {
            subject: companion,
            state: 'expanded',
          });

        case 'solo':
        case 'solo--fullscreen':
        case 'multi':
          if (path) {
            return invokePromise(LayoutOperation.Open, {
              subject: [path],
              // The detail plank opens beside its master (in-plank navigation anchors at its origin).
              pivotId: contextId,
              disposition: 'add',
              navigation: 'immediate',
            });
          }
          break;
      }

      return invokePromise(LayoutOperation.UpdateCompanion, { subject: companion });
    },
    [invokePromise, layout.mode],
  );
};
