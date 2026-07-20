//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph';
import { type ThemedClassName } from '@dxos/react-ui';

import { Companion } from '#components';
import { useCompanions } from '#hooks';

import { PlankCompanionControls } from './PlankControls';

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
  const companions = useCompanions(contextId);

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
