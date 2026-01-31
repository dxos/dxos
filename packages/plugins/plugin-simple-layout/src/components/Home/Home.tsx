//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Node, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Mosaic, type StackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListItem, useSearchListResults } from '@dxos/react-ui-searchlist';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/ui-theme';
import { byPosition } from '@dxos/util';

import { meta } from '../../meta';
import { useLoadDescendents } from '../hooks';

export type HomeProps = {};

export const Home = (_props: HomeProps) => {
  const { t } = useTranslation(meta.id);
  const userAccountItem = useItemsByDisposition('user-account')[0];
  const pinnedItems = useItemsByDisposition('pin-end', true);
  const workspaceItems = useItemsByDisposition('workspace');
  useLoadDescendents(Node.RootId);

  const items = useMemo(
    () => [...(userAccountItem ? [userAccountItem] : []), ...pinnedItems, ...workspaceItems],
    [userAccountItem, pinnedItems, workspaceItems],
  );

  const { results, handleSearch } = useSearchListResults({
    items,
    extract: (node) => toLocalizedString(node.properties.label, t),
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
              <Mosaic.Stack items={results} getId={(node) => node.id} Tile={WorkspaceTile} />
            </Mosaic.Viewport>
          </Mosaic.Container>
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
      // TODO(burdon): Use mosaic to manage selection.
      classNames={mx('dx-focus-ring', isSelected && 'bg-hoverOverlay')}
      fullWidth
      onClick={handleSelect}
    >
      <Card.Toolbar density='coarse'>
        <Avatar.Root>
          <Avatar.Content
            hue={data.properties.hue}
            icon={data.properties.icon}
            hueVariant='fill'
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

/** Filters nodes by disposition. */
const filterItems = (node: Node.Node, disposition: string) => {
  return node.properties.disposition === disposition;
};

/** Returns root-level items filtered by disposition. */
const useItemsByDisposition = (disposition: string, sort = false) => {
  const { graph } = useAppGraph();
  const connections = useConnections(graph, Node.RootId);
  const filtered = connections.filter((node) => filterItems(node, disposition));
  return sort ? filtered.toSorted((a, b) => byPosition(a.properties, b.properties)) : filtered;
};
