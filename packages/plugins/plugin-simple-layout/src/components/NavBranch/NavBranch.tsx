//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { type Node, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchPanel, useSearchListItem, useSearchListResults } from '@dxos/react-ui-search';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { useExpandPath } from '../hooks';

export type NavBranchProps = {
  id: string;
};

/**
 * Renders the children of a graph branch node as a searchable mosaic list.
 * Used for any node with `role: 'branch'` or a workspace disposition, including
 * spaces, collection sections, type sections, and schema nodes.
 */
export const NavBranch = ({ id }: NavBranchProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();

  useExpandPath(id);

  const children = useConnections(graph, id, 'child');

  // TODO(wittjosiah): Move alternate-tree nodes to a non-child relation so they don't need filtering.
  const visibleChildren = useMemo(
    () =>
      children.filter(
        (node) => node.properties.disposition !== 'alternate-tree' && node.properties.disposition !== 'hidden',
      ),
    [children],
  );

  const { results, handleSearch } = useSearchListResults({
    items: visibleChildren,
    extract: (child) => toLocalizedString(child.properties.label, t),
  });

  return (
    <SearchPanel onSearch={handleSearch}>
      <Mosaic.Container asChild>
        <ScrollArea.Root margin padding thin>
          <ScrollArea.Viewport>
            <Mosaic.Stack
              classNames='gap-1'
              draggable={false}
              items={results}
              getId={(item) => item.id}
              Tile={NavBranchTile}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </SearchPanel>
  );
};

const NavBranchTile: MosaicStackTileComponent<Node.Node> = (props) => {
  const data = props.data;
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const ref = useRef<HTMLDivElement>(null);
  const { selectedValue, registerItem, unregisterItem } = useSearchListItem();
  const isSelected = selectedValue === data.id;

  const name = toLocalizedString(data.properties.label, t);

  const handleSelect = useCallback(
    () => void invokePromise(LayoutOperation.Open, { subject: [data.id] }),
    [invokePromise, data.id],
  );

  // Register this item with the search context.
  useEffect(() => {
    if (ref.current) {
      registerItem(data.id, ref.current, handleSelect);
    }

    return () => unregisterItem(data.id);
  }, [data.id, handleSelect, registerItem, unregisterItem]);

  // Scroll into view when selected.
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  return (
    <Card.Root
      ref={ref}
      role='button'
      fullWidth
      tabIndex={-1} // TODO(burdon): Use Mosaic.Focus.
      data-selected={isSelected}
      classNames={mx('dx-focus-ring cursor-pointer', isSelected && 'bg-hover-overlay')}
      onClick={handleSelect}
    >
      <Card.Toolbar>
        <Avatar.Root>
          <Avatar.Content
            hue={data.properties.hue}
            icon={data.properties.icon}
            hueVariant='transparent'
            variant='square'
            size={8}
            fallback={name}
          />
          <Avatar.Label>{name}</Avatar.Label>
          <Icon icon='ph--caret-right--regular' />
        </Avatar.Root>
      </Card.Toolbar>
    </Card.Root>
  );
};
