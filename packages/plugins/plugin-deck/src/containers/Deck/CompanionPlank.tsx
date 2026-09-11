//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph/hooks';
import { type ThemedClassName } from '@dxos/react-ui';

import { Companion } from '#components';
import { useCompanions } from '#hooks';

import { PlankCompanionControls } from './PlankControls.tsx';

export type CompanionPlankProps = ThemedClassName<{
  /** The plank the pane belongs to, whose companions populate the variant switcher. */
  contextId: string;
  /** The companion node id (`<contextId>/~<variant>`) to show, absent when the plank has none. */
  id?: string;
}>;

/**
 * A companion rendered as an ordinary plank (no nested splitter). Switching a tab re-points the
 * trailing companion plank; the close control turns the deck companion off. Attention is shared with
 * the context plank via `attendableId`.
 *
 * Addressed by its context rather than by the companion it shows, so a plank with no companions still
 * has a pane: the reader opened it and only the reader closes it, so the tab strip is empty and
 * {@link Companion} says so rather than the pane collapsing.
 */
export const CompanionPlank = ({ contextId, id, classNames }: CompanionPlankProps) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();

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
      value={id}
      onValueChange={onValueChange}
      attendableId={contextId}
      companionTo={contextNode?.data}
      controls={controls}
    />
  );
};

CompanionPlank.displayName = 'CompanionPlank';
