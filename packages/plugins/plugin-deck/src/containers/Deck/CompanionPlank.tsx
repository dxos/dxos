//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph/hooks';
import { type ThemedClassName } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';

import { Companion } from '#components';
import { useCompanions } from '#hooks';

import { PlankCompanionControls } from './PlankControls.tsx';

export type CompanionPlankProps = ThemedClassName<{
  /**
   * The companion to show (`<plank>/~<variant>`), or the plank itself when it has no companions — the
   * pane belongs to the plank either way, and a linked segment names its plank as its parent.
   */
  id: string;
}>;

/**
 * A companion rendered as an ordinary plank (no nested splitter). Switching a tab re-points the
 * trailing companion plank; the close control turns the deck companion off. Attention is shared with
 * the context plank via `attendableId`.
 *
 * A plank with no companions still has a pane: the reader opened it and only the reader closes it, so
 * the tab strip is empty and {@link Companion} says so rather than the pane collapsing.
 */
export const CompanionPlank = ({ id, classNames }: CompanionPlankProps) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();

  const companion = Attention.isLinkedSegment(id);
  const contextId = (companion ? Attention.getParentId(id) : undefined) ?? id;
  const contextNode = useNode(graph, contextId);
  const companions = useCompanions(contextId) ?? [];

  const onValueChange = useCallback(
    (companion: string) => invokePromise(LayoutOperation.UpdateCompanion, { subject: companion }),
    [invokePromise],
  );

  const controls = useMemo(() => <PlankCompanionControls primary={contextId} />, [contextId]);

  return (
    <Companion
      classNames={classNames}
      companions={companions}
      value={companion ? id : undefined}
      onValueChange={onValueChange}
      attendableId={contextId}
      companionTo={contextNode?.data}
      controls={controls}
    />
  );
};

CompanionPlank.displayName = 'CompanionPlank';
