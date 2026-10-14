//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import type { BoardModel } from '@dxos/react-ui-mosaic';
import type { ProjectionModel } from '@dxos/schema';
import { shallowEqual } from '@dxos/util';

import { Kanban, KanbanLayout } from '#types';

import {
  computeColumnStructure,
  getOrderByColumnFromArrangement,
  getOrderFromArrangement,
  makePivotFieldIdAtom,
  orderItemsInColumn,
} from '../util/index.ts';

/**
 * Builds a board model that maps kanban arrangement and projection onto columns and per-column items.
 *
 * @template T - Item type (must have id; defaults to KanbanLayout.BaseKanbanItem).
 * @param kanban - Kanban object (arrangement, view).
 * @param projection - ProjectionModel for pivot field and options.
 * @param itemsAtom - Atom holding the full item list.
 * @param registry - Registry for reading atom values.
 * @returns BoardModel with columns atom, items family, and getColumns/getItems.
 */
export function useKanbanBoardModel<T extends KanbanLayout.BaseKanbanItem = KanbanLayout.BaseKanbanItem>(
  kanban: Kanban.Kanban,
  projection: ProjectionModel,
  itemsAtom: Atom.Atom<T[]>,
  registry: Registry.AtomRegistry,
): BoardModel<KanbanLayout.ColumnStructure, T> {
  // Source atoms: reactive reads from the kanban object; items come from the passed-in atom (e.g. AtomQuery or in-memory).
  const arrangementAtom = useMemo(() => Obj.atomProperty(kanban, 'arrangement'), [kanban]);

  const pivotFieldIdAtom = useMemo(() => makePivotFieldIdAtom(kanban), [kanban]);

  // Effective per-column ids: from kanban.arrangement.columns; empty when arrangement has no columns.
  const effectiveByColumnAtom = useMemo(
    () => Atom.make((get) => getOrderByColumnFromArrangement(get(arrangementAtom))),
    [arrangementAtom],
  );

  // Column structure: depends on pivotFieldId (not full view), arrangement, and projection so columns only fire when pivot or arrangement changes.
  const columnsAtom = useMemo(
    () =>
      Atom.make((get) => {
        const pivotFieldId = get(pivotFieldIdAtom);
        if (pivotFieldId === undefined) {
          return [];
        }

        get(projection.fields);
        const fieldProj = projection.tryGetFieldProjection(pivotFieldId);
        if (!fieldProj) {
          return [];
        }

        const selectOptions = fieldProj.props.options ?? [];
        if (selectOptions.length === 0) {
          return [];
        }

        const arrangement = get(arrangementAtom);
        const order = getOrderFromArrangement(arrangement);
        const byColumn = getOrderByColumnFromArrangement(arrangement);
        return computeColumnStructure(order, byColumn, selectOptions);
      }),
    [pivotFieldIdAtom, arrangementAtom, projection],
  );

  // Per-column slice of arrangement so each column’s items atom only depends on that column’s ids.
  const columnArrangementAtomFamily = useMemo(
    () =>
      Atom.family<string, Atom.Atom<KanbanLayout.ColumnStructure>>((columnValue: string) =>
        Atom.make((get) => {
          const byColumn = get(effectiveByColumnAtom);
          return {
            columnValue,
            ids: [...(byColumn[columnValue]?.ids ?? [])],
          };
        }),
      ),
    [effectiveByColumnAtom],
  );

  // Items for a single column: filter all items by pivot field, sort by this column’s ids, then append new items.
  const itemsAtomFamily = useMemo(
    () =>
      Atom.family<string, Atom.Atom<T[]>>((columnValue: string) =>
        Atom.make((get) => {
          const columnArr = get(columnArrangementAtomFamily(columnValue));
          const allItems = get(itemsAtom);
          const pivotFieldId = get(pivotFieldIdAtom);

          if (pivotFieldId === undefined) {
            return [];
          }

          // TODO(wittjosiah): Try to narrow this down further.
          get(projection.fields);
          const fieldProj = projection.tryGetFieldProjection(pivotFieldId);
          if (!fieldProj) {
            return [];
          }

          const selectOptions = fieldProj.props.options ?? [];
          const pivotPath = fieldProj.props.property;
          const validColumnValues = new Set(selectOptions.map((opt) => opt.id));
          const getColumn = (item: T): string | undefined => {
            const value =
              pivotPath === undefined
                ? undefined
                : Reflect.get(Obj.isObject(item) ? get(Obj.atom(item)) : item, pivotPath);
            return typeof value === 'string' ? value : undefined;
          };
          return orderItemsInColumn(allItems, columnArr.ids, columnValue, getColumn, validColumnValues);
        }).pipe(Atom.withEquality<T[]>(shallowEqual)),
      ),
    [columnArrangementAtomFamily, itemsAtom, pivotFieldIdAtom, projection],
  );

  return useMemo(
    () => ({
      getColumnId: (data) => data.columnValue,
      getItemId: (data) => (data as T).id,
      isColumn: (obj): obj is KanbanLayout.ColumnStructure =>
        typeof obj === 'object' && obj !== null && 'columnValue' in obj && 'ids' in obj,
      // TODO(wittjosiah): This should be restricted to objects of the type of the kanban view.
      isItem: (obj): obj is T => Obj.isObject(obj),
      columns: columnsAtom,
      items: (column) => itemsAtomFamily(column.columnValue),
      getColumns: () => registry.get(columnsAtom) ?? [],
      getItems: (column) => registry.get(itemsAtomFamily(column.columnValue)) ?? [],
    }),
    [columnsAtom, itemsAtomFamily, registry],
  );
}
