//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph/hooks';
import { type ThemedClassName } from '@dxos/react-ui';

import { Companion } from '#components';
import { useCompanions } from '#hooks';

import { PlankCompanionControls } from './PlankControls.tsx';

export type CompanionPlankProps = ThemedClassName<{
  /** The companion node id (`<contextPlankId>/~<variant>`). */
  id: string;
}>;

/**
 * A companion rendered as an ordinary plank (no nested splitter): its context is the preceding plank
 * (`id` minus the trailing `~<variant>` segment), whose companions populate the variant switcher.
 * Switching a tab re-points the trailing companion plank; the close control turns the deck companion
 * off. Attention is shared with the context plank via `attendableId`.
 */
export const CompanionPlank = ({ id, classNames }: CompanionPlankProps) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();

  const contextId = id.slice(0, id.lastIndexOf('/'));
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

export type CompanionEmptyPlankProps = ThemedClassName<{
  /** The plank whose companions are empty. */
  contextId: string;
}>;

/**
 * The companion pane for a plank that has no companions: the same frame and close control, with the
 * tab strip empty. The pane is open because the reader opened it, and only the reader closes it, so a
 * plank with nothing to put in it says so rather than collapsing the pane out from under them.
 */
export const CompanionEmptyPlank = ({ contextId, classNames }: CompanionEmptyPlankProps) => {
  const { graph } = useAppGraph();
  const contextNode = useNode(graph, contextId);
  const controls = useMemo(() => <PlankCompanionControls primary={contextId} />, [contextId]);

  return (
    <Companion
      classNames={classNames}
      companions={EMPTY_COMPANIONS}
      attendableId={contextId}
      companionTo={contextNode?.data}
      controls={controls}
    />
  );
};

CompanionEmptyPlank.displayName = 'CompanionEmptyPlank';

const EMPTY_COMPANIONS: AppGraphNode.Node[] = [];
