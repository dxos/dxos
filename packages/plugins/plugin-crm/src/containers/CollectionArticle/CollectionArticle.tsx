//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { type Space, useObject, useQuery } from '@dxos/react-client/echo';
import { Card, Focus, Icon, Panel, ToggleGroup, ToggleGroupIconItem, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { Masonry } from '@dxos/react-ui-masonry';
import { DynamicTable } from '@dxos/react-ui-table';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';

/** Sidebar layout modes for a type collection. */
type Layout = 'masonry' | 'table';

const LAYOUT_ICONS: Record<Layout, string> = {
  masonry: 'ph--squares-four--regular',
  table: 'ph--table--regular',
};

export type CollectionArticleProps = {
  role?: string;
  space: Space;
  type: Type.AnyEntity;
  attendableId: string;
};

/**
 * Generic collection view for every object of a type: a toolbar with a Masonry/Table layout switch
 * over a shared query. Mirrors the database type folder (`TypeCollectionArticle`) but lets the user
 * choose between the header-card masonry and a schema-derived table. Selecting an item opens it as a
 * sibling plank.
 */
export const CollectionArticle = ({ role, space, type, attendableId }: CollectionArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const currentId = useSelection(attendableId, 'single');
  const [layout, setLayout] = useState<Layout>('masonry');

  const objects = useQuery(space.db, Filter.type(Type.getURI(type)));

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
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='justify-end'>
          <ToggleGroup type='single' value={layout} onValueChange={(value) => value && setLayout(value as Layout)}>
            {(Object.keys(LAYOUT_ICONS) as Layout[]).map((value) => (
              <ToggleGroupIconItem
                key={value}
                value={value}
                icon={LAYOUT_ICONS[value]}
                label={t(`layout-${value}.label`)}
              />
            ))}
          </ToggleGroup>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        {objects.length === 0 ? (
          <Empty classNames='bs-full' label={t('type-collection-empty.message')} />
        ) : layout === 'table' ? (
          <DynamicTable type={type} rows={objects} onRowClick={handleOpen} />
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

  return <CollectionTile object={data.object} current={data.current} onOpen={data.onOpen} onDelete={data.onDelete} />;
};

/** Selectable header-only card for a single object. */
const CollectionTile = ({ object, current, onOpen, onDelete }: TileData) => {
  const { t } = useTranslation(meta.profile.key);
  // Subscribe so the label re-renders when the object changes.
  const [live] = useObject(object);
  const typename = Obj.getTypename(live);
  const label =
    Obj.getLabel(live) ||
    t('object-name.placeholder', { ns: typename ?? meta.profile.key, defaultValue: t('object-name.placeholder') });

  const iconAnnotation = Obj.getIcon(live);
  const icon = iconAnnotation?.icon ?? 'ph--circle-dashed--regular';
  const iconStyles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;

  // Always render the full object card body (e.g. PersonCard/OrganizationCard from plugin-preview);
  // types without a `CardContent` surface fall back to a header-only tile.
  const cardData = useMemo<AppSurface.ObjectCardData>(() => ({ subject: object }), [object]);

  const handleCurrentChange = useCallback(() => onOpen(object), [onOpen, object]);

  const menuItems = useMemo(
    () =>
      onDelete
        ? [
            {
              label: t('delete-object.label', {
                ns: typename ?? meta.profile.key,
                defaultValue: t('delete-object.label'),
              }),
              onClick: () => onDelete(object),
            },
          ]
        : [],
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
        <Surface.Surface type={AppSurface.CardContent} data={cardData} limit={1} />
      </Card.Root>
    </Focus.Item>
  );
};
