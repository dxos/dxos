//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Graph, Node, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Mosaic, type StackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListItem, useSearchListResults } from '@dxos/react-ui-searchlist';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

type HomeProps = {};

export const Home = (props: HomeProps) => {
  const { t } = useTranslation(meta.id);
  const workspaces = useWorkspaces();
  useLoadDescendents(Node.RootId);

  const { results, handleSearch } = useSearchListResults({
    items: workspaces,
    extract: (node) => toLocalizedString(node.properties.label, t),
  });

  return (
    <StackItem.Content toolbar>
      <SearchList.Root onSearch={handleSearch}>
        <Toolbar.Root>
          <SearchList.Input placeholder={t('search placeholder')} autoFocus />
        </Toolbar.Root>
        <SearchList.Content>
          <SearchList.Viewport classNames='flex flex-col gap-1'>
            <Mosaic.Container asChild>
              <Mosaic.Viewport>
                <Mosaic.Stack items={results} getId={(node) => node.id} Tile={WorkspaceTile} />
              </Mosaic.Viewport>
            </Mosaic.Container>
          </SearchList.Viewport>
        </SearchList.Content>
      </SearchList.Root>
    </StackItem.Content>
  );
};

const WorkspaceTile: StackTileComponent<Node.Node> = ({ data }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const { selectedValue, registerItem, unregisterItem } = useSearchListItem();
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    () => invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: data.id }),
    [invokePromise, data.id],
  );

  useLoadDescendents(data.id);

  const name = toLocalizedString(data.properties.label, t);
  const isSelected = selectedValue === data.id;

  // Register this workspace with the search context.
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

  // TODO(wittjosiah): Update this to use mosaic selection, integrating with the search list.
  return (
    <Card.Root
      ref={ref}
      role='button'
      tabIndex={-1}
      data-selected={isSelected}
      classNames={mx('dx-focus-ring', isSelected && 'bg-hoverOverlay')}
      onClick={handleSelect}
    >
      <Card.Toolbar>
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

const useLoadDescendents = (nodeId?: string) => {
  const { graph } = useAppGraph();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (nodeId) {
        Graph.expand(graph, nodeId, 'outbound');
        Graph.getConnections(graph, nodeId, 'outbound').forEach((child) => {
          Graph.expand(graph, child.id, 'outbound');
        });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [nodeId, graph]);
};

const useWorkspaces = () => {
  const { graph } = useAppGraph();

  // Get root connections to find collections.
  const rootConnections = useConnections(graph, Node.RootId);
  const collections = useMemo(
    () => rootConnections.filter((node) => node.properties.disposition === 'collection'),
    [rootConnections],
  );

  // Get first collection's children as workspaces.
  // TODO(wittjosiah): Support multiple collections or nested workspaces if needed.
  const firstCollection = collections[0];
  return useConnections(graph, firstCollection?.id);
};
