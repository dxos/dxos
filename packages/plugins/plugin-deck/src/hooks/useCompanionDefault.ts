//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Attention } from '@dxos/react-ui-attention/types';

import { DeckSchema } from '#types';

/**
 * Brings the companion up on help when a plank opens, unless the user has closed the pane in this
 * deck. Runs from the plank because its companions resolve only after the plank exists.
 */
export const useCompanionDefault = ({
  id,
  companions,
  companionPlanks,
  companionDismissed,
  flatten,
}: {
  id: string;
  companions: AppGraphNode.Node[];
  companionPlanks: readonly string[];
  companionDismissed?: boolean;
  flatten?: boolean;
}): void => {
  const { invokePromise } = useOperationInvoker();

  useEffect(() => {
    if (
      !DeckSchema.shouldOpenCompanionByDefault({
        companions,
        companionPlanks,
        companionDismissed,
        flatten,
        plankId: id,
      })
    ) {
      return;
    }

    void invokePromise(LayoutOperation.UpdateCompanion, {
      subject: Attention.linkedSegment(DeckSchema.DEFAULT_COMPANION_VARIANT),
      anchor: id,
    });
  }, [id, companions, companionPlanks, companionDismissed, flatten, invokePromise]);
};
