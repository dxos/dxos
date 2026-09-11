//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Attention } from '@dxos/react-ui-attention/types';

import { DeckSchema } from '#types';

/**
 * Brings the companion up on help when a plank opens. Runs from the plank because its companions
 * resolve only after the plank exists.
 *
 * Applied at most once per plank, tracked here rather than persisted: the default and a close are
 * otherwise the same state, so the pane would reopen the instant it was closed. Each newly opened
 * object gets the default again, and closing holds for the object it was closed on.
 */
export const useCompanionDefault = ({
  id,
  companions,
  companionPlanks,
  flatten,
}: {
  id: string;
  companions: AppGraphNode.Node[];
  companionPlanks: readonly string[];
  flatten?: boolean;
}): void => {
  const { invokePromise } = useOperationInvoker();
  const applied = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      applied.current === id ||
      !DeckSchema.shouldOpenCompanionByDefault({ companions, companionPlanks, flatten, plankId: id })
    ) {
      return;
    }

    applied.current = id;
    void invokePromise(LayoutOperation.UpdateCompanion, {
      subject: Attention.linkedSegment(DeckSchema.DEFAULT_COMPANION_VARIANT),
      anchor: id,
    });
  }, [id, companions, companionPlanks, flatten, invokePromise]);
};
