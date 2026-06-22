//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import { type Space, useObject, useQuery } from '@dxos/react-client/echo';
import { Card, Focus, Icon, Panel, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';

export type TypeCollectionArticleProps = {
  role?: string;
  space: Space;
  typeUri: URI.URI;
  attendableId: string;
};

/**
 * List view rendered when a type node is selected: a masonry grid of header-only cards, one per object
 * of the type. Selecting a card navigates to that object, opening it as a sibling plank. Objects are not
 * enumerated in the nav tree; each navigated object becomes a hidden child of the type node resolved on demand.
 */
export const TypeCollectionArticle = ({ role, space, typeUri, attendableId }: TypeCollectionArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const currentId = useSelection(attendableId, 'single');

  const objects = useQuery(space.db, Filter.type(typeUri));
  // Parented objects belong to a collection and surface there, not in the type's list.
  const visible = useMemo(() => objects.filter((object) => !Obj.getParent(object)), [objects]);

  const handleOpen = useCallback(
    (object: Obj.Unknown) => {
      const id = Obj.getURI(object);
      void invokePromise(LayoutOperation.Select, { contextId: attendableId, subject: { mode: 'single', id } });
      void invokePromise(LayoutOperation.Open, {
        subject: [Paths.getObjectPathFromObject(object)],
        pivotId: attendableId,
        navigation: 'immediate',
      });
    },
    [attendableId, invokePromise],
  );

  const tileItems = useMemo<TileData[]>(
    () =>
      visible.map((object) => ({
        object,
        current: Obj.getURI(object) === currentId,
        onOpen: handleOpen,
      })),
    [visible, currentId, handleOpen],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar />
      <Panel.Content>
        {visible.length === 0 ? (
          <div className='flex items-center justify-center bs-full text-subdued text-sm'>
            {t('type-collection-empty.message')}
          </div>
        ) : (
          <Masonry.Root Tile={TileAdapter}>
            <Masonry.Content>
              <Masonry.Viewport getId={(data) => Obj.getURI(data.object)} items={tileItems} />
            </Masonry.Content>
          </Masonry.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

type TileData = {
  object: Obj.Unknown;
  current: boolean;
  onOpen: (object: Obj.Unknown) => void;
};

const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.object) {
    return null;
  }

  return <TypeCollectionTile object={data.object} current={data.current} onOpen={data.onOpen} />;
};

type TypeCollectionTileProps = TileData;

/** Selectable header-only card for a single object. */
const TypeCollectionTile = ({ object, current, onOpen }: TypeCollectionTileProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Subscribe so the label re-renders when the object changes.
  const [live] = useObject(object);
  // Mirror the app-graph label: the object's own label, else the type-scoped placeholder
  // (e.g. "New video" lives in the type's namespace, not the space plugin's).
  const typename = Obj.getTypename(live);
  const label =
    Obj.getLabel(live) ||
    t('object-name.placeholder', { ns: typename ?? meta.profile.key, defaultValue: t('object-name.placeholder') });

  const iconAnnotation = Obj.getIcon(live);
  const icon = iconAnnotation?.icon ?? 'ph--circle-dashed--regular';
  const iconStyles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;

  // `Focus.Item` calls `onCurrentChange` on click and on Enter.
  const handleCurrentChange = useCallback(() => onOpen(object), [onOpen, object]);

  return (
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Card.Root fullWidth classNames={['dx-hover cursor-pointer', current && 'dx-current']}>
        <Card.Header>
          <Card.Block>
            <Icon icon={icon} classNames={iconStyles?.fg} />
          </Card.Block>
          <Card.Title classNames='line-clamp-2'>{label}</Card.Title>
        </Card.Header>
      </Card.Root>
    </Focus.Item>
  );
};
