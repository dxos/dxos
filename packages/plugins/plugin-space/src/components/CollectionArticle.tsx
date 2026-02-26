//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Layout, ScrollArea, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListResults } from '@dxos/react-ui-searchlist';
import { Collection } from '@dxos/schema';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '../meta';

/**
 * Hook to resolve metadata (icon, iconHue, etc.) for objects based on their typename.
 */
const useMetadataResolver = () => {
  const allMetadata = useCapabilities(AppCapabilities.Metadata);
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
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport classNames='p-2'>
                <Mosaic.Stack items={items} getId={(item) => item.id} Tile={ObjectTile} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
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
  iconHue?: string;
};

const ObjectTile: MosaicStackTileComponent<ObjectItem> = (props) => {
  const item = props.data;
  const { t } = useTranslation(meta.id);
  const { invokeSync } = useOperationInvoker();

  const typename = Obj.getTypename(item.object) ?? '';
  const label =
    Obj.getLabel(item.object) ??
    toLocalizedString(['object name placeholder', { ns: typename, defaultValue: item.id }], t);
  const styles = item.iconHue ? getStyles(item.iconHue) : undefined;

  const handleClick = () => {
    invokeSync(LayoutOperation.Open, { subject: [item.id] });
  };

  return (
    <Card.Root fullWidth>
      <Card.Toolbar>
        <Card.ToolbarIconButton variant='ghost' label={label} icon={item.icon} iconOnly iconClassNames={styles?.icon} />
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
    () => (collection.objects ?? []).map((ref) => ref.target).filter((obj): obj is Obj.Unknown => Obj.isObject(obj)),
    [collection.objects],
  );
};

/**
 * Hook to get items from a managed collection by querying the space.
 */
const useManagedCollectionItems = (collection: Collection.Managed): Obj.Unknown[] => {
  const client = useClient();
  const space = getSpace(collection);
  const [typename, feedKind] = collection.key.split('~');

  const schema = useMemo(
    () => client.graph.schemaRegistry.query({ typename, location: ['runtime'] }).runSync()[0],
    [client, typename],
  );

  const filter = useMemo(
    () =>
      typename === Type.Feed.typename
        ? Filter.type(Type.Feed, { kind: feedKind })
        : schema
          ? Filter.type(schema)
          : Filter.nothing(),
    [typename, schema, feedKind],
  );

  return useQuery(space?.db, filter);
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
          iconHue: metadata.iconHue,
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
