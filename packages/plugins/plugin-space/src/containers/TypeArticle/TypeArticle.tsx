//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { useAtomCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Filter, Obj, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Space } from '@dxos/react-client/echo';
import { Panel, Tabs, useTranslation } from '@dxos/react-ui';
import { Selection, useSelection, useSelectionActions, useViewStateActions } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import { DynamicTable, type TableRowAction } from '@dxos/react-ui-table';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { SpaceCapabilities, SpaceOperation } from '#types';

import { ObjectMasonry, type TileData } from '../ObjectMasonry';
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

  // Ordered by label: the query returns index order, which reads as arbitrary to someone scanning a
  // directory of cards. Sorted here rather than in the query because a label is DERIVED (`Obj.getLabel`
  // resolves a different property per type), so there is no single property to order on. Sorting the
  // INPUT leaves the search below free to rank by match score while a filter is active.
  const ordered = useMemo(
    () =>
      [...objects].sort((a, b) =>
        (Obj.getLabel(a) ?? '').localeCompare(Obj.getLabel(b) ?? '', undefined, { sensitivity: 'base' }),
      ),
    [objects],
  );

  // Text filter over the object labels; feeds both the masonry tiles and the table rows.
  const { results, handleSearch } = useSearchListResults<Obj.Unknown>({
    items: ordered,
    extract: (object) => Obj.getLabel(object) ?? '',
  });

  // Selection is keyed by the type's own URI — the same id the 'selected-objects' companion resolves
  // from its `companionTo` (see react-surface.tsx), so cards, table rows and the companion agree.
  const selectedIds = useSelection(typeUri, 'multi');
  const { multi: setSelectedObjects, toggle: toggleSelected } = useSelectionActions(typeUri);

  // TODO(burdon): Factor out as an aspect?
  const duplicates = useDuplicates({ space, type, objects, enabled: layout === 'duplicates' });
  const { mergePreview } = useAtomCapability(SpaceCapabilities.EphemeralState);
  const stagedPreview = mergePreview?.typeUri === typeUri ? mergePreview : undefined;

  // Merged-away ids would otherwise linger in the shared selection and the companion's card stack.
  // Functional update against the live selection: the merge operation is async, so a snapshot of
  // `selectedIds` taken at confirm time would drop any selection change made while it ran.
  const { update: updateSelection } = useViewStateActions(Selection.aspect, typeUri);
  const handleConfirmed = useCallback(
    (objectIds: string[]) =>
      updateSelection((previous) => ({
        mode: 'multi',
        ids: Selection.resolve(previous, 'multi').filter((id) => !objectIds.includes(id)),
      })),
    [updateSelection],
  );

  const duplicatesGroup = useDuplicatesGroup({
    typeUri,
    typename: Type.getTypename(type),
    spaceId: space.id,
    selectedIds,
    duplicates,
    onConfirmed: handleConfirmed,
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
  const tileItems = useMemo<TileData[]>(() => {
    const toTile = (object: Obj.Unknown): TileData => ({
      object,
      current: selectedIds.includes(object.id),
      onSelect: toggleSelected,
      onOpen: handleOpen,
      onDelete: Obj.getParent(object) ? undefined : handleDelete,
    });
    // While a merge is staged the participants fold into one read-only result card; members the
    // selection excluded stay behind as normal cards.
    if (layout === 'duplicates' && stagedPreview) {
      const participants = new Set(stagedPreview.objectIds);
      return [
        { object: stagedPreview.preview, current: true },
        ...tiles.filter((object) => !participants.has(object.id)).map(toTile),
      ];
    }
    return tiles.map(toTile);
  }, [layout, stagedPreview, tiles, selectedIds, toggleSelected, handleOpen, handleDelete]);

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
              <Menu.Toolbar>
                <Menu.Items />
              </Menu.Toolbar>
            </Menu.Root>
          </Panel.Toolbar>
          <Panel.Content>
            <LayoutPanel value='masonry' empty={noResults}>
              <ObjectMasonry cacheKey={typeUri} items={tileItems} />
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
                <ObjectMasonry cacheKey={typeUri} items={tileItems} />
              </LayoutPanel>
            )}
          </Panel.Content>
          <Panel.Statusbar classNames='flex items-center p-1 border-t border-subdued-separator'>
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

TypeArticle.displayName = 'TypeArticle';
