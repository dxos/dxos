//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Graph, Node, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListItem, useSearchListResults } from '@dxos/react-ui-searchlist';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

type HomeProps = ThemedClassName;

export const Home = ({ classNames }: HomeProps) => {
  const { t } = useTranslation(meta.id);
  const workspaces = useWorkspaces();
  useLoadDescendents(Node.RootId);

  const { results, handleSearch } = useSearchListResults({
    items: workspaces,
    extract: (node) => toLocalizedString(node.properties.label, t),
  });

  return (
    <div className={mx('flex flex-col', classNames)}>
      {/* <div className='container-max-width'>{t('workspaces heading')}</div> */}
      <SearchList.Root onSearch={handleSearch} classNames='container-max-width'>
        <div className='plb-3'>
          <SearchList.Input placeholder={t('search placeholder')} autoFocus />
        </div>
        <SearchList.Content>
          <SearchList.Viewport classNames='flex flex-col gap-1'>
            {results.map((node) => (
              <Workspace key={node.id} node={node} />
            ))}
          </SearchList.Viewport>
        </SearchList.Content>
      </SearchList.Root>
    </div>
  );
};

const Workspace = ({ node }: { node: Node.Node }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const { selectedValue, registerItem, unregisterItem } = useSearchListItem();
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    () => invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: node.id }),
    [invokePromise, node.id],
  );

  useLoadDescendents(node.id);

  const name = toLocalizedString(node.properties.label, t);
  const isSelected = selectedValue === node.id;

  // Register this workspace with the search context.
  useEffect(() => {
    if (ref.current) {
      registerItem(node.id, ref.current, handleSelect);
    }
    return () => unregisterItem(node.id);
  }, [node.id, handleSelect, registerItem, unregisterItem]);

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
      onClick={handleSelect}
    >
      <Card.Chrome classNames='grid grid-cols-[min-content_1fr_min-content] items-center gap-cardSpacingInline pie-cardSpacingInline'>
        <Avatar.Root>
          <Avatar.Content
            hue={node.properties.hue}
            icon={node.properties.icon}
            hueVariant='surface'
            variant='square'
            size={12}
            fallback={name}
          />
          <Avatar.Label>{name}</Avatar.Label>
          <Icon icon='ph--caret-right--regular' />
        </Avatar.Root>
      </Card.Chrome>
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
  const workspaces = useConnections(graph, firstCollection?.id);
  return workspaces;
};
