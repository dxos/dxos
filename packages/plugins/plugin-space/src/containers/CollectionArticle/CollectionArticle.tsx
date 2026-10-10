//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Collection, Obj } from '@dxos/echo';
import { useLabel } from '@dxos/echo-react';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchPanel, useSearchListResults } from '@dxos/react-ui-search';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tag from '@dxos/react-ui/Tag';
import * as Theme from '@dxos/react-ui/Theme';
import { getStyles, osTranslations } from '@dxos/ui-theme';

import { useArchiveMenuItem } from '#hooks';
import { meta } from '#meta';

/**
 * Article view for collections.
 */
export const CollectionArticle = ({ subject, attendableId }: AppSurface.ObjectArticleProps<Collection.Collection>) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { items, handleSearch } = useCollectionItems(subject, attendableId);

  return (
    <SearchPanel onSearch={handleSearch}>
      <Mosaic.Container asChild>
        <ScrollArea.Root>
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
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();

  const typename = Obj.getTypename(item.object) ?? '';
  const objectLabel = useLabel(item.object);
  const label =
    objectLabel ?? Theme.toLocalizedString(['object-name.placeholder', { ns: typename, defaultValue: item.id }], t);
  const styles = item.iconHue ? getStyles(item.iconHue) : undefined;

  const handleClick = useCallback(
    () => void invokePromise(LayoutOperation.Open, { subject: [item.targetPath] }),
    [invokePromise, item.targetPath],
  );
  const { archived, item: archiveItem } = useArchiveMenuItem(item.object);

  return (
    <Card.Root role='button' classNames='cursor-pointer' onClick={handleClick}>
      <Card.Header>
        <Layout.Block>
          <Icon.Icon icon={item.icon} classNames={styles?.fg} />
        </Layout.Block>
        <Card.Title>{label}</Card.Title>
        {archiveItem && (
          <Card.Menu label={t('toolbar-menu.label', { ns: osTranslations })}>
            <Menu.Item
              item={{ value: archiveItem.label, label: archiveItem.label, icon: archiveItem.icon }}
              onClick={archiveItem.onClick}
            />
          </Card.Menu>
        )}
      </Card.Header>
      {archived && (
        <Card.Row>
          <Tag.Tag classNames='justify-self-start'>{t('archived.label')}</Tag.Tag>
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
