//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { type SurfaceComponentProps, useCapabilities, useOperationInvoker } from '@dxos/app-framework/react';
import { Filter, Obj } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Layout, Mosaic, type StackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListResults } from '@dxos/react-ui-searchlist';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

/**
 * Hook to resolve metadata (icon, iconHue, etc.) for objects based on their typename.
 */
const useMetadataResolver = () => {
  const allMetadata = useCapabilities(Common.Capability.Metadata);
  return useCallback((typename: string) => allMetadata.find((m) => m.id === typename)?.metadata ?? {}, [allMetadata]);
};

/**
 * Article view for collections.
 */
export const CollectionArticle = ({ subject }: SurfaceComponentProps<Collection.Collection | Collection.Managed>) => {
  const { t } = useTranslation(meta.id);
  const resolveMetadata = useMetadataResolver();
  const { items, handleSearch } = useCollectionItems(subject, resolveMetadata);

  return (
    <Layout.Main toolbar>
      <SearchList.Root onSearch={handleSearch}>
        <Toolbar.Root>
          <SearchList.Input placeholder={t('search placeholder')} />
        </Toolbar.Root>
        <SearchList.Content>
          <Mosaic.Container asChild>
            <Mosaic.Viewport padding>
              <Mosaic.Stack items={items} getId={(item) => item.id} Tile={ObjectTile} />
            </Mosaic.Viewport>
          </Mosaic.Container>
        </SearchList.Content>
      </SearchList.Root>
    </Layout.Main>
  );
};

type ObjectItem = {
  id: string;
  object: Obj.Unknown;
  icon: string;
};

const ObjectTile: StackTileComponent<ObjectItem> = ({ data: item }) => {
  const { t } = useTranslation(meta.id);
  const { invokeSync } = useOperationInvoker();

  const typename = Obj.getTypename(item.object) ?? '';
  const label = Obj.getLabel(item.object) ?? toLocalizedString(['object name placeholder', { ns: typename, defaultValue: item.id }], t);

  const handleClick = () => {
    invokeSync(Common.LayoutOperation.Open, { subject: [item.id] });
  };

  return (
    <Card.Root fullWidth>
      <Card.Toolbar>
        <Card.ToolbarIconButton variant='ghost' label={label} icon={item.icon} iconOnly />
        <Card.Title onClick={handleClick}>{label}</Card.Title>
        <Card.Menu />
      </Card.Toolbar>
    </Card.Root>
  );
};

export default CollectionArticle;

/**
 * Hook to get items from a regular collection.
 */
const useRegularCollectionItems = (collection: Collection.Collection): Obj.Unknown[] => {
  return useMemo(
    () =>
      (collection.objects ?? [])
        .map((ref) => ref.target)
        .filter((obj): obj is Obj.Unknown => Obj.isObject(obj)),
    [collection.objects],
  );
};

/**
 * Hook to get items from a managed collection by querying the space.
 */
const useManagedCollectionItems = (collection: Collection.Managed): Obj.Unknown[] => {
  const client = useClient();
  const space = getSpace(collection);

  const schema = useMemo(
    () => client.graph.schemaRegistry.query({ typename: collection.key, location: ['runtime'] }).runSync()[0],
    [client, collection],
  );

  return useQuery(space?.db, schema ? Filter.type(schema) : Filter.nothing());
};

type MetadataResolver = (typename: string) => { icon?: string; iconHue?: string };

/**
 * Combined hook to get collection items with search/filter support.
 */
const useCollectionItems = (
  collection: Collection.Collection | Collection.Managed,
  resolveMetadata: MetadataResolver,
) => {
  const isManaged = Obj.instanceOf(Collection.Managed, collection);

  // Call both hooks unconditionally to satisfy React's rules of hooks.
  const regularObjects = useRegularCollectionItems(collection as Collection.Collection);
  const managedObjects = useManagedCollectionItems(collection as Collection.Managed);

  const objects = isManaged ? managedObjects : regularObjects;

  // Convert objects to items with resolved metadata.
  const items = useMemo(
    () =>
      objects.map((obj) => {
        const typename = Obj.getTypename(obj);
        const metadata = typename ? resolveMetadata(typename) : {};
        return {
          id: Obj.getDXN(obj).toString(),
          object: obj,
          icon: metadata.icon ?? 'ph--placeholder--regular',
        } satisfies ObjectItem;
      }),
    [objects, resolveMetadata],
  );

  // Use searchlist results for filtering.
  const { results, handleSearch } = useSearchListResults({
    items,
    extract: (item) => Obj.getLabel(item.object) ?? item.id,
  });

  return { items: results, handleSearch };
};
