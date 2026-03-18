//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, getCollectionObjectPath, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type Collection } from '@dxos/echo';
import { Panel, ScrollArea, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList, useSearchListResults } from '@dxos/react-ui-searchlist';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '../../meta';

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
export const CollectionArticle = ({ subject, attendableId }: SurfaceComponentProps<Collection.Collection>) => {
  const { t } = useTranslation(meta.id);
  const resolveMetadata = useMetadataResolver();
  const { items, handleSearch } = useCollectionItems(subject, resolveMetadata, attendableId);

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root className='dx-document'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <SearchList.Input placeholder={t('search placeholder')} />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            <Mosaic.Container asChild>
              <ScrollArea.Root orientation='vertical'>
                <ScrollArea.Viewport classNames='p-2'>
                  <Mosaic.Stack items={items} getId={(item) => item.id} Tile={ObjectTile} />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

type ObjectItem = {
  id: string;
  object: Obj.Unknown;
  targetPath: string;
  icon: string;
  iconHue?: string;
};

const ObjectTile: MosaicStackTileComponent<ObjectItem> = ({ data: item }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const typename = Obj.getTypename(item.object) ?? '';
  const label =
    Obj.getLabel(item.object) ??
    toLocalizedString(['object name placeholder', { ns: typename, defaultValue: item.id }], t);
  const styles = item.iconHue ? getStyles(item.iconHue) : undefined;

  const handleClick = useCallback(
    () => void invokePromise(LayoutOperation.Open, { subject: [item.targetPath] }),
    [invokePromise, item.targetPath],
  );

  return (
    <Card.Root fullWidth role='button' classNames='cursor-pointer' onClick={handleClick}>
      <Card.Toolbar>
        <Card.ToolbarIconButton
          variant='ghost'
          label={label}
          icon={item.icon}
          iconOnly
          iconClassNames={styles?.surfaceText}
        />
        <Card.Title>{label}</Card.Title>
        <Card.Menu />
      </Card.Toolbar>
    </Card.Root>
  );
};

type MetadataResolver = (typename: string) => { icon?: string; iconHue?: string };

/**
 * Combined hook to get collection items with search/filter support.
 */
const useCollectionItems = (
  collection: Collection.Collection,
  resolveMetadata: MetadataResolver,
  attendableId?: string,
) => {
  const objects = useMemo(
    () => (collection.objects ?? []).map((ref) => ref.target).filter((obj): obj is Obj.Unknown => Obj.isObject(obj)),
    [collection.objects],
  );

  const items = useMemo(
    () =>
      objects.map((obj) => {
        const typename = Obj.getTypename(obj);
        const metadata = typename ? resolveMetadata(typename) : {};
        const targetPath = attendableId
          ? getCollectionObjectPath(attendableId, obj.id)
          : getObjectPathFromObject(obj);

        return {
          id: Obj.getDXN(obj).toString(),
          object: obj,
          targetPath,
          icon: metadata.icon ?? 'ph--placeholder--regular',
          iconHue: metadata.iconHue,
        } satisfies ObjectItem;
      }),
    [objects, resolveMetadata, attendableId],
  );

  const { results, handleSearch } = useSearchListResults({
    items,
    extract: (item) => Obj.getLabel(item.object) ?? item.id,
  });

  return { items: results, handleSearch };
};
