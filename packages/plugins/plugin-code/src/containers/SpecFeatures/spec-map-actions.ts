//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Attention, useSelection, useSelectionActions } from '@dxos/react-ui-attention';

import { FEATURE_COMPANION } from '../../constants.ts';

/** The plank's single selection, which the feature companion follows; selecting shows the companion. */
export const useFeatureSelection = (attendableId: string | undefined) => {
  const selectedId = useSelection(attendableId, 'single');
  const { clear } = useSelectionActions(attendableId);
  const showItem = ToolkitHooks.useShowItem();
  const select = useCallback(
    (id: string | undefined) => {
      if (!attendableId || id === selectedId) {
        return;
      }
      if (id) {
        void showItem({
          contextId: attendableId,
          selectionId: id,
          companion: Attention.linkedSegment(FEATURE_COMPANION),
        });
      } else {
        clear();
      }
    },
    [attendableId, selectedId, showItem, clear],
  );
  return { selectedId, select };
};
