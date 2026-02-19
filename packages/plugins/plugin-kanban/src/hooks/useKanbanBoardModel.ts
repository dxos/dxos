//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import type { BoardModel } from '@dxos/react-ui-mosaic';
import type { ProjectionModel } from '@dxos/schema';

import { type BaseKanbanItem, type ColumnStructure, type Kanban, UNCATEGORIZED_VALUE } from '../types';
import { computeColumnStructure, getEffectiveByColumnFromArrangement, getEffectiveOrderFromArrangement } from '../util';

export function useKanbanBoardModel<T extends BaseKanbanItem = BaseKanbanItem>(
  kanban: Kanban.Kanban,
  projection: ProjectionModel,
  itemsAtom: Atom.Atom<T[]>,
  registry: Registry.Registry,
): BoardModel<ColumnStructure, T> {
  // Source atoms: reactive reads from the kanban object; items come from the passed-in atom (e.g. AtomQuery or in-memory).
  const arrangementAtom = useMemo(() => AtomObj.makeProperty(kanban, 'arrangement'), [kanban]);
  const viewSnapshotAtom = useMemo(
    () => (kanban?.view ? AtomObj.make(kanban.view) : Atom.make<undefined>(() => undefined)),
    [kanban?.view],
  );

  /** Only changes when view.projection.pivotFieldId changes; keeps columns from firing on other view updates. */
  const pivotFieldIdAtom = useMemo(
    () => Atom.make((get) => get(viewSnapshotAtom)?.projection?.pivotFieldId as string | undefined),
    [viewSnapshotAtom],
  );

  // Effective per-column ids: from kanban.arrangement.columns; empty when arrangement has no columns.
  const effectiveByColumnAtom = useMemo(
    () => Atom.make((get) => getEffectiveByColumnFromArrangement(get(arrangementAtom))),
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
        const order = getEffectiveOrderFromArrangement(arrangement);
        const byColumn = getEffectiveByColumnFromArrangement(arrangement);
        return computeColumnStructure(order, byColumn, selectOptions);
      }),
    [pivotFieldIdAtom, arrangementAtom, projection],
  );

  // Per-column slice of arrangement so each column’s items atom only depends on that column’s ids.
  const columnArrangementAtomFamily = useMemo(
    () =>
      Atom.family<string, Atom.Atom<ColumnStructure>>((columnValue: string) =>
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
          const view = get(viewSnapshotAtom);

          const pivotFieldId = view?.projection?.pivotFieldId;
          if (pivotFieldId === undefined) {
            return [];
          }

          const fieldProj = projection.tryGetFieldProjection(pivotFieldId);
          if (!fieldProj) {
            return [];
          }

          const selectOptions = fieldProj.props.options ?? [];
          const pivotPath = fieldProj.props.property;
          const validColumnValues = new Set(selectOptions.map((opt) => opt.id));
          const ids = columnArr.ids;
          const orderMap = new Map(ids.map((id, index) => [id, index]));

          const cardsWithExistingOrder: T[] = [];
          const newCards: T[] = [];

          for (const item of allItems) {
            const itemColumn = item[pivotPath as keyof typeof item];
            const isValidColumn = itemColumn && validColumnValues.has(itemColumn as string);
            const belongsInColumn = columnValue === UNCATEGORIZED_VALUE ? !isValidColumn : itemColumn === columnValue;

            if (belongsInColumn) {
              if (orderMap.has(item.id)) {
                cardsWithExistingOrder.push(item);
              } else {
                newCards.push(item);
              }
            }
          }

          cardsWithExistingOrder.sort((a, b) => {
            const indexA = orderMap.get(a.id) ?? Infinity;
            const indexB = orderMap.get(b.id) ?? Infinity;
            return indexA - indexB;
          });

          return [...cardsWithExistingOrder, ...newCards];
        }),
      ),
    [columnArrangementAtomFamily, itemsAtom, viewSnapshotAtom, projection],
  );

  return useMemo(
    () => ({
      getColumnId: (data) => data.columnValue,
      getItemId: (data) => (data as T).id,
      isColumn: (obj): obj is ColumnStructure =>
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
