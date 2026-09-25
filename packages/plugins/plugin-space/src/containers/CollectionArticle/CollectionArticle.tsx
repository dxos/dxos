//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection, Obj } from '@dxos/echo';
import { ScrollArea, Tag, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Icon } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchPanel, useSearchListResults } from '@dxos/react-ui-search';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';

import { useArchiveMenuItem } from '../../hooks/index.ts';

/**
 * Article view for collections.
 */
export const CollectionArticle = ({ subject, attendableId }: AppSurface.ObjectArticleProps<Collection.Collection>) => {
  const { t } = useTranslation(meta.profile.key);
  const { items, handleSearch } = useCollectionItems(subject, attendableId);

  return (
    <SearchPanel onSearch={handleSearch}>
      <Mosaic.Container asChild>
        <ScrollArea.Root centered padding thin>
          <ScrollArea.Viewport>
            <Mosaic.Stack
              classNames='gap-1'
              draggable={false}
              items={items}
              getId={(item) => item.id}
              Tile={ObjectTile}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </SearchPanel>
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
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  const typename = Obj.getTypename(item.object) ?? '';
  const label =
    Obj.getLabel(item.object) ??
    toLocalizedString(['object-name.placeholder', { ns: typename, defaultValue: item.id }], t);
  const styles = item.iconHue ? getStyles(item.iconHue) : undefined;

  const handleClick = useCallback(
    () => void invokePromise(LayoutOperation.Open, { subject: [item.targetPath] }),
    [invokePromise, item.targetPath],
  );
  const { archived, item: archiveItem } = useArchiveMenuItem(item.object);

  return (
    <Card.Root fullWidth role='button' classNames='cursor-pointer' onClick={handleClick}>
      <Card.Header>
        <Card.Block>
          <Icon icon={item.icon} classNames={styles?.fg} />
        </Card.Block>
        <Card.Title>{label}</Card.Title>
        <Card.Menu items={archiveItem ? [archiveItem] : undefined} />
      </Card.Header>
      {archived && (
        <Card.Row>
          <Tag classNames='justify-self-start'>{t('archived.label')}</Tag>
        </Card.Row>
      )}
    </Card.Root>
  );
};

/**
 * Combined hook to get collection items with search/filter support.
 */
const useCollectionItems = (collection: Collection.Collection, attendableId?: string) => {
  const objects = useAtomValue(
    useMemo(
      () =>
        Atom.make((get) =>
          (get(Obj.atomProperty(collection, 'objects')) ?? []).flatMap((ref) => {
            const value = get(ref.atom);
            return value ? [value] : [];
          }),
        ),
      [collection],
    ),
  );

  const items = useMemo(
    () =>
      objects.map((obj) => {
        const iconAnnotation = Obj.getIcon(obj);
        const targetPath = attendableId
          ? GraphPath.getCollectionObjectPath(attendableId, obj.id)
          : GraphPath.getObjectPathFromObject(obj);

        return {
          id: Obj.getURI(obj),
          object: obj,
          targetPath,
          icon: iconAnnotation?.icon ?? 'ph--circle-dashed--regular',
          iconHue: iconAnnotation?.hue,
        } satisfies ObjectItem;
      }),
    [objects, attendableId],
  );

  const { results, handleSearch } = useSearchListResults({
    items,
    extract: (item) => Obj.getLabel(item.object) ?? item.id,
  });

  return { items: results, handleSearch };
};

CollectionArticle.displayName = 'CollectionArticle';
