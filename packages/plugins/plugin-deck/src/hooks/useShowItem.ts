//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useLayout } from '@dxos/app-toolkit/ui';
import { AttentionOperation } from '@dxos/plugin-attention/operations';

import { ChangeCompanion } from '../operations/definitions';

export type ShowItemOptions = {
  /** Attention context id — typically the master surface's attendableId. */
  contextId: string;
  /** Id of the item being made the current selection in that context. */
  selectionId: string;
  /** Companion segment target, e.g. `linkedSegment('message')`. */
  companion: string;
  /**
   * Navigation path used only in `'multi'` layout mode. Omit to fall back to
   * companion behavior.
   */
  path?: string;
};

/**
 * Master-detail dispatch helper. Selects the item in the attention context,
 * then — based on the current layout mode — shows its detail surface:
 *
 * - `'simple'`: expand the complementary sidebar on the given companion segment.
 * - `'multi'`: open the item as a sibling plank beside the master (`pivotId = contextId`), when a `path` is provided.
 * - otherwise: swap the current plank's companion to the given segment.
 */
export const useShowItem = () => {
  const { invokePromise } = useOperationInvoker();
  const layout = useLayout();

  return useCallback(
    async ({ contextId, selectionId, companion, path }: ShowItemOptions) => {
      await invokePromise(AttentionOperation.Select, {
        contextId,
        selection: { mode: 'single', id: selectionId },
      });

      switch (layout.mode) {
        case 'simple':
          return invokePromise(LayoutOperation.UpdateComplementary, {
            subject: companion,
            state: 'expanded',
          });

        case 'multi':
          if (path) {
            return invokePromise(LayoutOperation.Open, {
              subject: [path],
              pivotId: contextId,
              navigation: 'immediate',
            });
          }
          break;
      }

      return invokePromise(ChangeCompanion, { companion });
    },
    [invokePromise, layout.mode],
  );
};
