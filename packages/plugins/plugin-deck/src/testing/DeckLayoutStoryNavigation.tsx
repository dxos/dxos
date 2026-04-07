//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph, useLayout } from '@dxos/app-toolkit/ui';
import { Graph, Node } from '@dxos/plugin-graph';
import { Icon, List, ListItem } from '@dxos/react-ui';

export type DeckLayoutStoryNavigationProps = {
  current?: string;
};

/**
 * Minimal test-only navigation list for DeckLayout stories.
 * Renders root graph children and opens them via LayoutOperation.Open on click.
 */
export const DeckLayoutStoryNavigation = forwardRef<HTMLDivElement, DeckLayoutStoryNavigationProps>(
  (_props, forwardedRef) => {
    const { graph } = useAppGraph();
    const layout = useLayout();
    const { invokePromise } = useOperationInvoker();

    const items = useMemo(
      () => Graph.getConnections(graph, Node.RootId, 'child').filter((node) => !Node.isActionLike(node)),
      [graph],
    );

    const activeSet = useMemo(() => new Set(layout.active), [layout.active]);

    return (
      <div ref={forwardedRef} className='overflow-y-auto p-2'>
        <List>
          {items.map((node) => (
            <ListItem.Root
              key={node.id}
              classNames={activeSet.has(node.id) ? 'bg-active-surface' : undefined}
              onClick={() => void invokePromise(LayoutOperation.Open, { subject: [node.id] })}
            >
              {node.properties.icon && (
                <ListItem.Endcap>
                  <Icon icon={node.properties.icon} size={4} />
                </ListItem.Endcap>
              )}
              <ListItem.Heading>{typeof node.properties.label === 'string' ? node.properties.label : node.id}</ListItem.Heading>
            </ListItem.Root>
          ))}
        </List>
      </div>
    );
  },
);
