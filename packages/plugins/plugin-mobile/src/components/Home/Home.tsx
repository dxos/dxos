//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchPanel, useSearchListItem, useSearchListResults } from '@dxos/react-ui-search';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Theme from '@dxos/react-ui/Theme';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { useExpandPath } from '../hooks.ts';

export type HomeProps = {};

/**
 * Home screen.
 */
export const Home = (_: HomeProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  // Profile and settings moved to the navbar's main menu; Home lists spaces only.
  const items = useItemsByDisposition('workspace');
  useExpandPath(GraphNode.RootId);

  const { results, handleSearch } = useSearchListResults({
    items,
    extract: (node) => Theme.toLocalizedString(node.properties.label, t),
  });

  return (
    <SearchPanel onSearch={handleSearch}>
      <Mosaic.Container asChild>
        <ScrollArea.Root>
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
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { selectedValue, registerItem, unregisterItem } = useSearchListItem();
  const name = Theme.toLocalizedString(data.properties.label, t);
  const titleId = UiHooks.useId('mobile-tile');
  const pending = data.properties.pending === true;
  const isSelected = selectedValue === data.id;
  const cardRef = useRef<HTMLDivElement>(null);

  useExpandPath(data.id);

  const handleSelect = useCallback(
    () => (pending ? undefined : invokePromise(LayoutOperation.SwitchWorkspace, { subject: data.id })),
    [invokePromise, data.id, pending],
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
      tabIndex={-1} // TODO(burdon): Use Mosaic.Focus.
      data-selected={isSelected}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      // The search list auto-selects the first row for keyboard nav; a coarse (touch) pointer has no
      // keyboard focus to reflect, so the highlight would just read as an unexplained random row.
      classNames={mx('dx-focus-ring', isSelected && 'bg-selected-surface pointer-coarse:bg-transparent')}
      onClick={handleSelect}
      ref={cardRef}
    >
      <Card.Header>
        {/* `Card.Header` is a 3-track subgrid: the gutter `Card.Block`s and the center
            `Card.Title` are what keep the icon, label, and caret on one row. */}
        <Layout.Block>
          <Avatar.Root
            icon={data.properties.icon}
            hue={Avatar.toAvatarHue(data.properties.hue)}
            hueVariant='transparent'
            variant='square'
            fallback={name}
            aria-labelledby={titleId}
          />
        </Layout.Block>
        <Card.Title id={titleId} classNames='cursor-pointer'>
          {name}
        </Card.Title>
        <Layout.Block rail='end'>{!pending && <Icon.Icon icon='ph--caret-right--regular' />}</Layout.Block>
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
  const { graph } = ToolkitHooks.useAppGraph();
  const connections = GraphHooks.useConnections(graph, GraphNode.RootId, 'child');
  return useMemo(() => connections.filter((node) => filterItems(node, disposition)), [connections, disposition]);
};
