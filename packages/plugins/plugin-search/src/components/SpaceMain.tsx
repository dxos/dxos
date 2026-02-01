//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useCapabilities, useOperationInvoker } from '@dxos/app-framework/react';
import { Filter, Obj, Query } from '@dxos/echo';
import { Graph, Node, useActionRunner, useConnections } from '@dxos/plugin-graph';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Mosaic, type StackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList } from '@dxos/react-ui-searchlist';
import { Layout } from '@dxos/react-ui-mosaic';
import { Text } from '@dxos/schema';

import { meta } from '../meta';

/**
 * Hook to resolve metadata (icon, iconHue, etc.) for objects based on their typename.
 */
// TODO(wittjosiah): Factor out.
const useMetadataResolver = () => {
  const allMetadata = useCapabilities(Common.Capability.Metadata);
  return useCallback((typename: string) => allMetadata.find((m) => m.id === typename)?.metadata ?? {}, [allMetadata]);
};

export const SpaceMain = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const { items, handleSearch } = useSpaceItems(space);

  return (
    <Layout.Main toolbar classNames='bs-full'>
      <SearchList.Root onSearch={handleSearch}>
        <Toolbar.Root>
          <SearchList.Input placeholder={t('search placeholder')} />
        </Toolbar.Root>
        <SearchList.Content>
          <Mosaic.Container asChild>
            <Mosaic.Viewport classNames='pli-1'>
              <Mosaic.Stack items={items} getId={(node) => node.id} Tile={NodeTile} />
            </Mosaic.Viewport>
          </Mosaic.Container>
        </SearchList.Content>
      </SearchList.Root>
    </Layout.Main>
  );
};

const NodeTile: StackTileComponent<Node.Node> = ({ data: node }) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const { invokeSync } = useOperationInvoker();
  const runAction = useActionRunner();

  const label = toLocalizedString(node.properties.label, t);
  const icon = node.properties.icon ?? 'ph--placeholder--regular';

  const handleClick = () => {
    if (Node.isAction(node)) {
      // Run action if this is an action node.
      const [parent] = Graph.getConnections(graph, node.id, 'inbound');
      if (parent) {
        void runAction(node, { parent });
      }
    } else {
      // Navigate to the node.
      invokeSync(Common.LayoutOperation.Open, { subject: [node.id] });
    }
  };

  return (
    <Card.Root fullWidth>
      <Card.Toolbar>
        <Card.ToolbarIconButton label={label} icon={icon} iconOnly />
        <Card.Title onClick={handleClick}>{label}</Card.Title>
        <Card.Menu />
      </Card.Toolbar>
    </Card.Root>
  );
};

/**
 * Hook to get space items with search/filter support.
 * Returns direct children when no query, or full-text search results when searching.
 */
const useSpaceItems = (space: Space) => {
  const { graph } = useAppGraph();
  const [query, setQuery] = useState<string>();
  const resolveMetadata = useMetadataResolver();

  // Expand the space node to load its children (needed when navigating directly to a space URL).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      Graph.expand(graph, space.id, 'outbound');
    });
    return () => cancelAnimationFrame(frame);
  }, [graph, space.id]);

  // Get direct children of the space node for the default view.
  const children = useConnections(graph, space.id, 'outbound');

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
  }, []);

  // TODO(dmaretskyi): Switch back to QueryEditor once query builder is ready for production.
  // Query results using full-text search.
  const results = useQuery(
    space.db,
    query === undefined
      ? Query.select(Filter.nothing())
      : Query.all(
          Query.select(Filter.text(query, { type: 'full-text' })).select(Filter.not(Filter.type(Text.Text))),
          Query.select(Filter.text(query, { type: 'full-text' }))
            .select(Filter.type(Text.Text))
            .referencedBy('dxos.org/type/Document', 'content'),
        ),
  );

  // Determine if query is empty (show default view).
  const isQueryEmpty = !query?.trim();

  // Filter children to those which are objects or actions with disposition 'item'.
  const filteredChildren = useMemo(
    () =>
      children.filter((node) => {
        // Include regular objects.
        if (Obj.isObject(node.data)) {
          return true;
        }
        // Include actions with disposition 'item'.
        return Node.isAction(node) && node.properties.disposition === 'item';
      }),
    [children],
  );

  // When showing default view, use nodes (which may include actions).
  // When showing search results, wrap objects in a compatible shape with resolved metadata.
  const items = useMemo(() => {
    if (isQueryEmpty) {
      return filteredChildren;
    }
    // Wrap query results as pseudo-nodes for consistent rendering.
    return results.map((obj) => {
      const typename = Obj.getTypename(obj);
      const metadata = typename ? resolveMetadata(typename) : {};
      return {
        id: obj.id,
        type: 'search-result',
        data: obj,
        properties: {
          label: Obj.getLabel(obj) ?? obj.id,
          icon: metadata.icon ?? 'ph--placeholder--regular',
          iconHue: metadata.iconHue,
        },
      } as Node.Node;
    });
  }, [isQueryEmpty, filteredChildren, results, resolveMetadata]);

  return { items, handleSearch };
};

export default SpaceMain;
