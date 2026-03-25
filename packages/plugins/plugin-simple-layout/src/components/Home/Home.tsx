//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Node, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, Panel, ScrollArea, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListItem, useSearchListResults } from '@dxos/react-ui-searchlist';
import { mx } from '@dxos/ui-theme';
import { byPosition, getHostPlatform, isTauri } from '@dxos/util';

import { meta } from '../../meta';
import { useExpandPath } from '../hooks';

export type HomeProps = {};

/**
 * Home screen.
 */
export const Home = (_: HomeProps) => {
  const { t } = useTranslation(meta.id);
  const userAccountItem = useItemsByDisposition('user-account')[0];
  const pinnedItems = useItemsByDisposition('pin-end', true);
  const workspaceItems = useItemsByDisposition('workspace');
  useExpandPath(Node.RootId);

  const items = useMemo(
    () => [...(userAccountItem ? [userAccountItem] : []), ...pinnedItems, ...workspaceItems],
    [userAccountItem, pinnedItems, workspaceItems],
  );

  const { results, handleSearch } = useSearchListResults({
    items,
    extract: (node) => toLocalizedString(node.properties.label, t),
  });

  const autoFocus = !isTauri() || getHostPlatform() !== 'ios';

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root>
        <Panel.Content asChild>
          <SearchList.Content>
            <Mosaic.Container asChild>
              <ScrollArea.Root orientation='vertical'>
                <ScrollArea.Viewport classNames='p-2'>
                  <Mosaic.Stack items={results} getId={(node) => node.id} Tile={WorkspaceTile} />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          </SearchList.Content>
        </Panel.Content>
        <Panel.Statusbar asChild>
          <Toolbar.Root>
            <SearchList.Input placeholder={t('search placeholder')} autoFocus={autoFocus} />
          </Toolbar.Root>
        </Panel.Statusbar>
      </Panel.Root>
    </SearchList.Root>
  );
};

const WorkspaceTile: MosaicStackTileComponent<Node.Node> = (props) => {
  const data = props.data;
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const { selectedValue, registerItem, unregisterItem } = useSearchListItem();
  const name = toLocalizedString(data.properties.label, t);
  const isSelected = selectedValue === data.id;
  const cardRef = useRef<HTMLDivElement>(null);

  useExpandPath(data.id);

  const handleSelect = useCallback(
    () => invokePromise(LayoutOperation.SwitchWorkspace, { subject: data.id }),
    [invokePromise, data.id],
  );

  // Register this workspace with the search context.
  useEffect(() => {
    if (cardRef.current) {
      registerItem(data.id, cardRef.current, handleSelect);
    }

    return () => unregisterItem(data.id);
  }, [data.id, handleSelect, registerItem, unregisterItem]);

  // Scroll into view when selected.
  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  return (
    <Card.Root
      role='button'
      fullWidth
      tabIndex={-1} // TODO(burdon): Use Mosaic.Focus.
      data-selected={isSelected}
      classNames={mx('dx-focus-ring', isSelected && 'bg-hover-overlay')}
      onClick={handleSelect}
      ref={cardRef}
    >
      <Card.Toolbar density='coarse'>
        <Avatar.Root>
          <Avatar.Content
            icon={data.properties.icon}
            hue={data.properties.hue}
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

/** Filters nodes by disposition. */
const filterItems = (node: Node.Node, disposition: string) => {
  return node.properties.disposition === disposition;
};

/** Returns root-level items filtered by disposition. */
const useItemsByDisposition = (disposition: string, sort = false) => {
  const { graph } = useAppGraph();
  const connections = useConnections(graph, Node.RootId, 'child');
  return useMemo(() => {
    const filtered = connections.filter((node) => filterItems(node, disposition));
    return sort ? filtered.toSorted((a, b) => byPosition(a.properties, b.properties)) : filtered;
  }, [connections, disposition, sort]);
};
