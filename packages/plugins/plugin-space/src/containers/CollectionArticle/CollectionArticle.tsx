//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getCollectionObjectPath, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Annotation, type Collection, Obj, Type } from '@dxos/echo';
import { ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card, Toolbar } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchPanel, useSearchListResults } from '@dxos/react-ui-search';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';

/**
 * Article view for collections.
 */
export const CollectionArticle = ({ subject, attendableId }: AppSurface.ObjectArticleProps<Collection.Collection>) => {
  const { t } = useTranslation(meta.id);
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
  const { t } = useTranslation(meta.id);
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

  return (
    <Card.Root fullWidth role='button' classNames='cursor-pointer' onClick={handleClick}>
      <Card.Header>
        <Toolbar.IconButton
          variant='ghost'
          label={label}
          icon={item.icon}
          iconOnly
          iconClassNames={styles?.foreground}
        />
        <Card.Title>{label}</Card.Title>
        <Card.Menu />
      </Card.Header>
    </Card.Root>
  );
};

/**
 * Combined hook to get collection items with search/filter support.
 */
const useCollectionItems = (collection: Collection.Collection, attendableId?: string) => {
  const objects = useMemo(
    () => (collection.objects ?? []).map((ref) => ref.target).filter((obj): obj is Obj.Unknown => Obj.isObject(obj)),
    [collection.objects],
  );

  const items = useMemo(
    () =>
      objects.map((obj) => {
        const type = Obj.getType(obj);
        const iconAnnotation = type
          ? Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(type)))
          : undefined;
        const targetPath = attendableId ? getCollectionObjectPath(attendableId, obj.id) : getObjectPathFromObject(obj);

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
