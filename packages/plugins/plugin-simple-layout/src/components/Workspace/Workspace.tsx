//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useRef } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Graph, type Node, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Mosaic, type StackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListItem, useSearchListResults } from '@dxos/react-ui-searchlist';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

export type WorkspaceProps = {
  id: string;
};

/**
 * Searchable list of children for a workspace node.
 */
export const Workspace = ({ id }: WorkspaceProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();

  // Expand the workspace node to load its children.
  useLoadDescendents(id);

  // Get direct children of the workspace node.
  const children = useConnections(graph, id, 'outbound');

  const { results, handleSearch } = useSearchListResults({
    items: children,
    extract: (child) => toLocalizedString(child.properties.label, t),
  });

  return (
    <StackItem.Content toolbar classNames='bs-full'>
      <SearchList.Root onSearch={handleSearch}>
        <Toolbar.Root>
          <SearchList.Input placeholder={t('search placeholder')} autoFocus />
        </Toolbar.Root>
        <SearchList.Content>
          <Mosaic.Container asChild>
            <Mosaic.Viewport classNames='pli-1'>
              <Mosaic.Stack items={results} getId={(child) => child.id} Tile={WorkspaceChildTile} />
            </Mosaic.Viewport>
          </Mosaic.Container>
        </SearchList.Content>
      </SearchList.Root>
    </StackItem.Content>
  );
};

const WorkspaceChildTile: StackTileComponent<Node.Node> = ({ data }) => {
  const { t } = useTranslation(meta.id);
  const { invokeSync } = useOperationInvoker();
  const ref = useRef<HTMLDivElement>(null);
  const { selectedValue, registerItem, unregisterItem } = useSearchListItem();
  const isSelected = selectedValue === data.id;

  const name = toLocalizedString(data.properties.label, t);

  const handleSelect = useCallback(
    () => invokeSync(Common.LayoutOperation.Open, { subject: [data.id] }),
    [invokeSync, data.id],
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
      tabIndex={-1}
      data-selected={isSelected}
      classNames={mx('dx-focus-ring', isSelected && 'bg-hoverOverlay')}
      fullWidth
      onClick={handleSelect}
    >
      <Card.Toolbar density='coarse'>
        <Avatar.Root>
          <Avatar.Content
            hue={data.properties.hue}
            icon={data.properties.icon}
            hueVariant='surface'
            variant='square'
            size={12}
            fallback={name}
          />
          <Avatar.Label>{name}</Avatar.Label>
          <Icon icon='ph--caret-right--regular' />
        </Avatar.Root>
      </Card.Toolbar>
    </Card.Root>
  );
};

/**
 * Hook to expand graph nodes two levels deep when directly linked to.
 */
const useLoadDescendents = (nodeId?: string) => {
  const { graph } = useAppGraph();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (nodeId) {
        // First level: expand the node itself.
        Graph.expand(graph, nodeId, 'outbound');
        // Second level: expand each child.
        Graph.getConnections(graph, nodeId, 'outbound').forEach((child) => {
          Graph.expand(graph, child.id, 'outbound');
        });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [nodeId, graph]);
};
