//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { type SurfaceComponentProps, useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Filter, Obj } from '@dxos/echo';
import { Graph, Node, useActionRunner, useConnections } from '@dxos/plugin-graph';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Layout, Mosaic, type StackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListResults } from '@dxos/react-ui-searchlist';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

/**
 *
 */
export const CollectionArticle = ({ subject }: SurfaceComponentProps<Collection.Collection | Collection.Managed>) => {
  const { t } = useTranslation(meta.id);
  const { items, handleSearch } = useCollectionItems(subject);

  return (
    <Layout.Main toolbar>
      <SearchList.Root onSearch={handleSearch}>
        <Toolbar.Root>
          <SearchList.Input placeholder={t('search placeholder')} />
        </Toolbar.Root>
        <SearchList.Content>
          <Mosaic.Container asChild>
            <Mosaic.Viewport padding>
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
        <Card.ToolbarIconButton variant='ghost' label={label} icon={icon} />
        <Card.Title onClick={handleClick}>{label}</Card.Title>
        <Card.Menu />
      </Card.Toolbar>
    </Card.Root>
  );
};

export default CollectionArticle;

/**
 * Hook to get items from a regular collection using graph connections.
 */
const useRegularCollectionItems = (collection: Collection.Collection) => {
  const { graph } = useAppGraph();
  const collectionId = Obj.getDXN(collection).toString();
  const children = useConnections(graph, collectionId, 'outbound');

  // Filter children to those which are objects or actions with disposition 'item'.
  return useMemo(
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
};

/**
 * Hook to get items from a managed collection by querying the space.
 */
const useManagedCollectionItems = (collection: Collection.Managed) => {
  const client = useClient();
  const space = getSpace(collection);

  const schema = useMemo(
    () => client.graph.schemaRegistry.query({ typename: collection.key, location: ['runtime'] }).runSync()[0],
    [client, collection],
  );

  const objects = useQuery(space?.db, schema ? Filter.type(schema) : Filter.nothing());

  // Convert objects to node-like items for consistent rendering.
  return useMemo(
    () =>
      objects.map(
        (obj) =>
          ({
            id: Obj.getDXN(obj).toString(),
            type: 'managed-object',
            data: obj,
            properties: {
              label: Obj.getLabel(obj) ?? obj.id,
              icon: 'ph--placeholder--regular',
            },
          }) as Node.Node,
      ),
    [objects],
  );
};

/**
 * Combined hook to get collection items with search/filter support.
 */
const useCollectionItems = (collection: Collection.Collection | Collection.Managed) => {
  const isManaged = Obj.instanceOf(Collection.Managed, collection);

  // Call both hooks unconditionally to satisfy React's rules of hooks.
  const regularItems = useRegularCollectionItems(collection as Collection.Collection);
  const managedItems = useManagedCollectionItems(collection as Collection.Managed);

  const items = isManaged ? managedItems : regularItems;

  // Use searchlist results for filtering.
  const { results, handleSearch } = useSearchListResults({
    items,
    extract: (node) => {
      const label = node.properties.label;
      return typeof label === 'string' ? label : (label?.en ?? node.id);
    },
  });

  return { items: results, handleSearch };
};
