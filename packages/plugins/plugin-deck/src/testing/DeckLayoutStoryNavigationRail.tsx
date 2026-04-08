//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph, useLayout } from '@dxos/app-toolkit/ui';
import { Graph, Node } from '@dxos/plugin-graph';
import { Icon, List, ListItem } from '@dxos/react-ui';

export type DeckLayoutStoryNavigationRailProps = {
  current?: string;
};

/**
 * Test-only sidebar navigation for DeckLayout stories.
 * Uses {@link LayoutOperation.Set} to a single plank.
 * Rows in `layout.active` use `bg-active-surface`.
 */
export const DeckLayoutStoryNavigationRail = forwardRef<HTMLDivElement, DeckLayoutStoryNavigationRailProps>(
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
      <div ref={forwardedRef} className='box-border h-full min-h-0 w-full overflow-y-auto p-2'>
        <List>
          {items.map((node) => (
            <ListItem.Root
              key={node.id}
              classNames={activeSet.has(node.id) ? 'bg-active-surface' : undefined}
              onClick={() => void invokePromise(LayoutOperation.Set, { subject: [node.id] })}
            >
              {node.properties.icon && (
                <ListItem.Endcap>
                  <Icon icon={node.properties.icon} size={4} />
                </ListItem.Endcap>
              )}
              <ListItem.Heading>
                {typeof node.properties.label === 'string' ? node.properties.label : node.id}
              </ListItem.Heading>
            </ListItem.Root>
          ))}
        </List>
      </div>
    );
  },
);
