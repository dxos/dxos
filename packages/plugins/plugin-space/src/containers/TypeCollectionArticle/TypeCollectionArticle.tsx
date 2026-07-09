//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppAnnotation, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import { type Space, useObject, useQuery } from '@dxos/react-client/echo';
import { Card, Focus, Icon, Panel, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
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

  const handleDelete = useCallback((object: Obj.Unknown) => {
    Obj.getDatabase(object)?.remove(object);
  }, []);

  const tileItems = useMemo<TileData[]>(
    () =>
      objects.map((object) => ({
        object,
        current: Obj.getURI(object) === currentId,
        onOpen: handleOpen,
        onDelete: Obj.getParent(object) ? undefined : handleDelete,
      })),
    [objects, currentId, handleOpen, handleDelete],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar />
      <Panel.Content>
        {objects.length === 0 ? (
          <Empty classNames='bs-full' label={t('type-collection-empty.message')} />
        ) : (
          <Masonry.Root Tile={TileAdapter}>
            <Masonry.Content classNames='p-trim-md'>
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
  onDelete?: (object: Obj.Unknown) => void;
};

const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.object) {
    return null;
  }

  return (
    <TypeCollectionTile object={data.object} current={data.current} onOpen={data.onOpen} onDelete={data.onDelete} />
  );
};

type TypeCollectionTileProps = TileData;

/** Selectable header-only card for a single object. */
const TypeCollectionTile = ({ object, current, onOpen, onDelete }: TypeCollectionTileProps) => {
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

  // Render a content preview body only for types that opt in via `CardAnnotation`.
  const type = Obj.getType(object);
  const showCardContent =
    !!type && Option.getOrElse(AppAnnotation.CardAnnotation.get(Type.getSchema(type)), () => false);
  const cardData = useMemo<AppSurface.ObjectCardData>(() => ({ subject: object }), [object]);

  // `Focus.Item` calls `onCurrentChange` on click and on Enter.
  const handleCurrentChange = useCallback(() => onOpen(object), [onOpen, object]);

  const menuItems = useMemo(
    () => [
      ...(onDelete
        ? [
            {
              label: t('delete-object.label', {
                ns: typename ?? meta.profile.key,
                defaultValue: t('delete-object.label'),
              }),
              onClick: () => onDelete?.(object),
            },
          ]
        : []),
    ],
    [t, typename, onDelete, object],
  );

  return (
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Card.Root fullWidth classNames={['dx-hover cursor-pointer', current && 'dx-current']}>
        <Card.Header>
          <Card.Block>
            <Icon icon={icon} classNames={iconStyles?.text} />
          </Card.Block>
          <Card.Title>{label}</Card.Title>
          {menuItems.length > 0 && <Card.Menu items={menuItems} />}
        </Card.Header>
        {showCardContent && <Surface.Surface type={AppSurface.CardContent} data={cardData} limit={1} />}
      </Card.Root>
    </Focus.Item>
  );
};

TypeCollectionArticle.displayName = 'TypeCollectionArticle';
