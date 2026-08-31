//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import * as GraphNode from '@dxos/graph/GraphNode';
import { useConnections } from '@dxos/plugin-graph/hooks';
import { Avatar, Icon, ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchPanel, useSearchListItem, useSearchListResults } from '@dxos/react-ui-search';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { useExpandPath } from '../hooks';

export type HomeProps = {};

/**
 * Home screen.
 */
export const Home = (_: HomeProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Profile and settings moved to the navbar's main menu; Home lists spaces only.
  const items = useItemsByDisposition('workspace');
  useExpandPath(GraphNode.RootId);

  const { results, handleSearch } = useSearchListResults({
    items,
    extract: (node) => toLocalizedString(node.properties.label, t),
  });

  return (
    <SearchPanel onSearch={handleSearch}>
      <Mosaic.Container asChild>
        <ScrollArea.Root centered padding thin>
          <ScrollArea.Viewport>
            <Mosaic.Stack
              classNames='py-2 gap-1'
              draggable={false}
              items={results}
              getId={(item) => item.id}
              Tile={WorkspaceTile}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </SearchPanel>
  );
};

const WorkspaceTile: MosaicStackTileComponent<AppGraphNode.Node> = (props) => {
  const data = props.data;
  const { t } = useTranslation(meta.profile.key);
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
      // The search list auto-selects the first row for keyboard nav; a coarse (touch) pointer has no
      // keyboard focus to reflect, so the highlight would just read as an unexplained random row.
      classNames={mx('dx-focus-ring', isSelected && 'bg-selected-surface pointer-coarse:bg-transparent')}
      onClick={handleSelect}
      ref={cardRef}
    >
      <Card.Header>
        <Avatar.Root>
          {/* `Card.Header` is a 3-track subgrid: the gutter `Card.Block`s and the center
              `Card.Title` are what keep the icon, label, and caret on one row. */}
          <Card.Block>
            <Avatar.Content
              icon={data.properties.icon}
              hue={data.properties.hue}
              hueVariant='transparent'
              variant='square'
              size={8}
              fallback={name}
            />
          </Card.Block>
          <Avatar.Label asChild>
            <Card.Title classNames='cursor-pointer'>{name}</Card.Title>
          </Avatar.Label>
          <Card.Block end>
            <Icon icon='ph--caret-right--regular' />
          </Card.Block>
        </Avatar.Root>
      </Card.Header>
    </Card.Root>
  );
};

/** Filters nodes by disposition. */
const filterItems = (node: AppGraphNode.Node, disposition: string) => {
  return node.properties.disposition === disposition;
};

/** Returns root-level items filtered by disposition. */
const useItemsByDisposition = (disposition: string) => {
  const { graph } = useAppGraph();
  const connections = useConnections(graph, GraphNode.RootId, 'child');
  return useMemo(() => connections.filter((node) => filterItems(node, disposition)), [connections, disposition]);
};
