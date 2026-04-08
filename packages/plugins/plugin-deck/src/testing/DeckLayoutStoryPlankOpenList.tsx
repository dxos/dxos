//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, Node } from '@dxos/plugin-graph';
import { Button, Icon } from '@dxos/react-ui';

export type DeckLayoutStoryPlankOpenListProps = {
  /** Plank id used as {@link LayoutOperation.Open} `pivotId` when branching from this plank. */
  pivotId: string;
};

/**
 * Test-only in-plank open list for DeckLayout stories.
 * Ghost buttons call {@link LayoutOperation.Open} with `pivotId` (distinct from {@link DeckLayoutStoryNavigationRail}).
 */
export const DeckLayoutStoryPlankOpenList = ({ pivotId }: DeckLayoutStoryPlankOpenListProps) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();

  const items = useMemo(
    () => Graph.getConnections(graph, Node.RootId, 'child').filter((node) => !Node.isActionLike(node)),
    [graph],
  );

  return (
    <div
      className='flex shrink-0 flex-col gap-1 border-b border-separator p-2'
      role='group'
      aria-label='Open from this plank'
    >
      {items.map((node) => (
        <Button
          key={node.id}
          variant='ghost'
          classNames='w-full justify-start gap-2'
          onClick={() =>
            void invokePromise(LayoutOperation.Open, {
              subject: [node.id],
              pivotId,
              navigation: 'immediate',
            })
          }
        >
          {node.properties.icon && <Icon icon={node.properties.icon} size={4} />}
          <span className='truncate'>
            {typeof node.properties.label === 'string' ? node.properties.label : node.id}
          </span>
        </Button>
      ))}
    </div>
  );
};
