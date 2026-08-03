//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { type Space } from '@dxos/react-client/echo';
import { Card, Focus, Icon, Panel, useTranslation } from '@dxos/react-ui';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import { DynamicTable, type TableRowAction } from '@dxos/react-ui-table';
import { Tabs } from '@dxos/react-ui-tabs';
import { CardAnnotation } from '@dxos/schema';
import { getStyles, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { SpaceOperation } from '../../operations';
import { useDuplicatesGroup } from './duplicatesGroup';
import { useDuplicates } from './useDuplicates';

/** Sidebar layout modes for a type article. */
type Layout = 'masonry' | 'table' | 'duplicates';

const LAYOUTS: { value: Layout; icon: string }[] = [
  {
    value: 'masonry',
    icon: 'ph--squares-four--regular',
  },
  {
    value: 'table',
    icon: 'ph--table--regular',
  },
  {
    value: 'duplicates',
    icon: 'ph--copy--regular',
  },
];

export type TypeArticleProps = {
  role?: string;
  space: Space;
  type: Type.AnyEntity;
  attendableId: string;
};

/**
 * List view rendered when a type node is selected: a toolbar with a Masonry/Table layout switch and a
 * text filter over every object of the type. Selecting an item opens it as a sibling plank.
 *
 * Objects are not enumerated in the nav tree; each navigated object becomes a hidden child of the
 * type node resolved on demand.
 */
export const TypeArticle = ({ role, space, type, attendableId }: TypeArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const [layout, setLayout] = useState<Layout>('masonry');
  const typeUri = Type.getURI(type);
  const objects = useQuery(space.db, Filter.type(typeUri));

  // Text filter over the object labels; feeds both the masonry tiles and the table rows.
  const { results, handleSearch } = useSearchListResults<Obj.Unknown>({
    items: objects,
    extract: (object) => Obj.getLabel(object) ?? '',
  });

  // Selection is keyed by the type's own URI — the same id the 'selected-objects' companion resolves
  // from its `companionTo` (see react-surface.tsx), so cards, table rows and the companion agree.
  const selectedIds = useSelection(typeUri, 'multi');
  const { multi: setSelectedObjects, toggle: toggleSelected } = useSelectionActions(typeUri);

  // TODO(burdon): Factor out as an aspect?
  const duplicates = useDuplicates({ space, type, objects, enabled: layout === 'duplicates' });
  const duplicatesGroup = useDuplicatesGroup({
    typeUri,
    typename: Type.getTypename(type),
    duplicates,
  });

  // Duplicates is offered only for types some plugin registered an identity rule for:
  // there is nothing to scan otherwise.
  const layouts = useMemo(
    () => LAYOUTS.filter(({ value }) => value !== 'duplicates' || duplicates.spec),
    [duplicates.spec],
  );

  const handleOpen = useCallback(
    (object: Obj.Unknown) => {
      const id = Obj.getURI(object);
      void invokePromise(LayoutOperation.Select, { contextId: attendableId, subject: { mode: 'single', id } });
      void invokePromise(LayoutOperation.Open, {
        // Open under the node being viewed rather than the object's canonical type path, so an object
        // reached from a type section opens within that section. Identical for a database type node,
        // whose object path already is `<typeNode>/<id>`.
        subject: [GraphPath.getCollectionObjectPath(attendableId, object.id)],
        pivotId: attendableId,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [attendableId, invokePromise],
  );

  const handleDelete = useCallback((object: Obj.Unknown) => {
    Obj.getDatabase(object)?.remove(object);
  }, []);

  // Undoable removal of every checked row, so a mis-click on a multi-row delete is recoverable.
  const handleDeleteSelected = useCallback(() => {
    const selected = objects.filter((object) => selectedIds.includes(object.id));
    if (selected.length > 0) {
      void invokePromise(SpaceOperation.RemoveObjects, { objects: selected }, { spaceId: space.id });
      setSelectedObjects([]);
    }
  }, [objects, selectedIds, invokePromise, space.id, setSelectedObjects]);

  // Stable identity: `DynamicTable` rebuilds its model whenever `features` changes, so an inline
  // literal here would discard and re-seed the table's selection on every render.
  const tableFeatures = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' as const },
      dataEditable: true,
      schemaEditable: false,
      pinColumns: 1,
    }),
    [],
  );

  // Table rows are editable, so opening a row is a deliberate row action rather than `onRowClick`
  // (which would fire on every cell click and fight with in-cell editing).
  const rowActions = useMemo(
    (): TableRowAction[] => [{ id: 'open', label: ['open-object.label', { ns: meta.profile.key }] }],
    [],
  );

  const handleRowAction = useCallback(
    (actionId: string, object: Obj.Unknown) => {
      if (actionId === 'open') {
        handleOpen(object);
      }
    },
    [handleOpen],
  );

  // One action graph for the whole toolbar: the mode-specific actions first, then the layout toggle.
  // Composing several `Toolbar.Root`s instead would each need their own roving-focus group and would
  // fight over the row's width.
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .subgraph(layout === 'duplicates' && duplicatesGroup)
        .subgraph(
          layout === 'table' &&
            selectedIds.length > 0 &&
            ((builder) => {
              builder.action(
                'delete-selected',
                {
                  label: ['delete-selected.label', { ns: meta.profile.key, count: selectedIds.length }],
                  icon: 'ph--trash--regular',
                },
                handleDeleteSelected,
              );
            }),
        )
        .separator()
        .group(
          'layout',
          {
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: layout,
            label: ['layout.label', { ns: meta.profile.key }],
          },
          (group) => {
            layouts.forEach(({ value, icon }) => {
              group.action(value, { label: [`layout-${value}.label`, { ns: meta.profile.key }], icon }, () =>
                setLayout(value),
              );
            });
          },
        )
        .build(),
    [layout, layouts, selectedIds.length, duplicatesGroup, handleDeleteSelected],
  );

  // The card grid backs two layouts — every object for `masonry`, only the group under review for
  // `duplicates` — so the items are resolved here and the grid itself is declared once.
  const tiles = layout === 'duplicates' ? duplicates.current : results;
  const tileItems = useMemo<TileData[]>(
    () =>
      tiles.map((object) => ({
        object,
        current: selectedIds.includes(object.id),
        onSelect: toggleSelected,
        onOpen: handleOpen,
        onDelete: Obj.getParent(object) ? undefined : handleDelete,
      })),
    [tiles, selectedIds, toggleSelected, handleOpen, handleDelete],
  );

  // A type with no objects at all has nothing for any layout to show; past that each layout says
  // when it is empty for its own reason.
  const noObjects = objects.length === 0 ? t('type-collection-empty.message') : undefined;
  const noResults = noObjects ?? (results.length === 0 ? t('search-no-results.message') : undefined);
  const noDuplicates =
    noObjects ??
    (duplicates.current.length === 0
      ? duplicates.scanning
        ? t('duplicates-scanning.message')
        : t('duplicates-none.message')
      : undefined);

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Tabs.Root asChild value={layout} onValueChange={(value) => setLayout(value as Layout)}>
        <Panel.Root role={role}>
          <Panel.Toolbar classNames={mx('grid', layout !== 'duplicates' && 'grid-cols-[1fr_auto]')}>
            {layout !== 'duplicates' && <SearchList.Input placeholder={t('search-placeholder.label')} />}
            <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive>
              <Menu.Toolbar />
            </Menu.Root>
          </Panel.Toolbar>
          <Panel.Content>
            <LayoutPanel value='masonry' empty={noResults}>
              <Masonry.Root Tile={TileAdapter}>
                <Masonry.Content>
                  <Masonry.Viewport cacheKey={typeUri} getId={(data) => Obj.getURI(data.object)} items={tileItems} />
                </Masonry.Content>
              </Masonry.Root>
            </LayoutPanel>
            <LayoutPanel value='table' empty={noResults}>
              <DynamicTable
                type={type}
                rows={results}
                features={tableFeatures}
                rowActions={rowActions}
                // Seed from the shared selection so switching card → table keeps what was selected;
                // the table otherwise starts from its own empty model.
                selection={selectedIds}
                onRowAction={handleRowAction}
                onSelectionChanged={setSelectedObjects}
              />
            </LayoutPanel>
            {duplicates.spec && (
              <LayoutPanel value='duplicates' empty={noDuplicates}>
                <Masonry.Root Tile={TileAdapter}>
                  <Masonry.Content>
                    <Masonry.Viewport cacheKey={typeUri} getId={(data) => Obj.getURI(data.object)} items={tileItems} />
                  </Masonry.Content>
                </Masonry.Root>
              </LayoutPanel>
            )}
          </Panel.Content>
          <Panel.Statusbar className='flex items-center p-1 border-t border-subdued-separator'>
            {t('item-count.label', { count: tileItems.length })}
          </Panel.Statusbar>
        </Panel.Root>
      </Tabs.Root>
    </SearchList.Root>
  );
};

/** One layout's content, or the message standing in for it when the layout has nothing to show. */
const LayoutPanel = ({ value, empty, children }: PropsWithChildren<{ value: Layout; empty?: string }>) => (
  <Tabs.Panel value={value} classNames='contents'>
    {empty ? <Empty classNames='h-full' label={empty} /> : children}
  </Tabs.Panel>
);

type TileData = {
  object: Obj.Unknown;
  current: boolean;
  onSelect: (id: string) => void;
  onOpen: (object: Obj.Unknown) => void;
  onDelete?: (object: Obj.Unknown) => void;
};

const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.object) {
    return null;
  }

  return <ObjectTile {...data} />;
};

/** Selectable header-only card for a single object. */
const ObjectTile = ({ object, current, onSelect, onOpen, onDelete }: TileData) => {
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

  // Render a content preview body only for types that opt in via `CardAnnotation`.
  const type = Obj.getType(object);
  const showCardContent = !!type && Option.getOrElse(CardAnnotation.get(Type.getSchema(type)), () => false);
  const cardData = useMemo<AppSurface.ObjectCardData>(() => ({ subject: object }), [object]);

  // `Focus.Item` calls `onCurrentChange` on click and on Enter. A card click toggles selection —
  // the companion follows the selection, so navigating away on every click would fight the review
  // workflow; opening stays available from the card menu.
  const handleCurrentChange = useCallback(() => onSelect(object.id), [onSelect, object]);

  const menuItems = useMemo(
    () => [
      {
        icon: 'ph--arrow-square-out--regular',
        label: t('open-object.label', {
          ns: typename ?? meta.profile.key,
          defaultValue: t('open-object.label'),
        }),
        onClick: () => onOpen(object),
      },
      ...(onDelete
        ? [
            {
              icon: 'ph--trash--regular',
              label: t('delete-object.label', {
                ns: typename ?? meta.profile.key,
                defaultValue: t('delete-object.label'),
              }),
              onClick: () => onDelete(object),
            },
          ]
        : []),
    ],
    [t, typename, onOpen, onDelete, object],
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

TypeArticle.displayName = 'TypeArticle';
