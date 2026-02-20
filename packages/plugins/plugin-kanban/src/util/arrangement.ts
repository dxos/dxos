//
// Copyright 2025 DXOS.org
//

import { type SelectOption } from '@dxos/echo/internal';

import {
  type ArrangedCards,
  type BaseKanbanItem,
  type ColumnStructure,
  type Kanban,
  UNCATEGORIZED_VALUE,
} from '../types';

/**
 * Column order from a raw arrangement object (e.g. when working with arrangement only).
 *
 * @param arrangement - Optional arrangement; reads order.
 * @returns Mutable copy of order array, or empty if arrangement/order missing or empty.
 */
export const getOrderFromArrangement = (arrangement?: Kanban.Arrangement): string[] => {
  const order = arrangement?.order;
  if (order != null && order.length > 0) {
    return [...order];
  }

  return [];
};

/**
 * Per-column card id order and optional hidden flag from a raw arrangement object.
 *
 * Returns mutable copies so schema readonly does not leak to callers.
 *
 * @param arrangement - Optional arrangement; reads columns.
 * @returns Map of column value → { ids, hidden? }; empty object if not set.
 */
export const getOrderByColumnFromArrangement = (
  arrangement?: Kanban.Arrangement,
): Record<string, { ids: string[]; hidden?: boolean }> => {
  const columns = arrangement?.columns;
  if (columns != null && Object.keys(columns).length > 0) {
    return Object.fromEntries(
      Object.entries(columns).map(([key, entry]) => [
        key,
        { ids: [...(entry.ids ?? [])], ...(entry.hidden !== undefined && { hidden: entry.hidden }) },
      ]),
    );
  }

  return {};
};

/**
 * Builds the ordered list of columns (value + ids) for the board model.
 *
 * Column order: uncategorized first, then effectiveOrder, then any selectOption ids not yet in order.
 * Each entry gets the ids from effectiveByColumn for that column (or empty).
 *
 * @param effectiveOrder - Column order from arrangement (or previous merge).
 * @param effectiveByColumn - Per-column card id order from arrangement.
 * @param selectOptions - Defines valid column ids; any missing from order are appended.
 * @returns ColumnStructure array in display order.
 */
export const computeColumnStructure = (
  effectiveOrder: string[],
  effectiveByColumn: Record<string, { ids: string[]; hidden?: boolean }>,
  selectOptions: SelectOption[],
): ColumnStructure[] => {
  const order = [...effectiveOrder];
  if (!order.includes(UNCATEGORIZED_VALUE)) {
    order.unshift(UNCATEGORIZED_VALUE);
  }

  for (const opt of selectOptions) {
    if (opt.id !== UNCATEGORIZED_VALUE && !order.includes(opt.id)) {
      order.push(opt.id);
    }
  }

  return order.map((columnValue) => ({
    columnValue,
    ids: effectiveByColumn[columnValue]?.ids ?? [],
  }));
};

/**
 * Computes the full item arrangement for the board: one entry per column with items in display order.
 *
 * Columns follow selectOptions order (uncategorized first, then each option). Within each column,
 * cards that appear in the kanban's saved arrangement keep that order; any other cards in that
 * column are appended after them.
 *
 * @param object - Kanban object whose arrangement holds per-column id order.
 * @param items - All items to distribute into columns.
 * @param pivotPath - Optional item property key whose value is the column id (e.g. status, priority).
 * @param selectOptions - Defines valid column ids and their display order.
 * @returns Array of { columnValue, cards } in column order, with cards ordered as above.
 */
export const computeItemArrangement = <T extends BaseKanbanItem = { id: string }>({
  object,
  items,
  pivotPath,
  selectOptions,
}: {
  object: Kanban.Kanban;
  items: T[];
  pivotPath?: string;
  selectOptions: SelectOption[];
}): ArrangedCards<T> => {
  const validColumnValues = new Set(selectOptions.map((opt) => opt.id));
  const byColumn = getOrderByColumnFromArrangement(object?.arrangement);

  // Column order: uncategorized first, then each select option (skip uncategorized if duplicated).
  const columnEntries = [
    { columnValue: UNCATEGORIZED_VALUE, ids: byColumn[UNCATEGORIZED_VALUE]?.ids ?? [] },
    ...selectOptions
      .filter((opt) => opt.id !== UNCATEGORIZED_VALUE)
      .map((opt) => ({ columnValue: opt.id, ids: byColumn[opt.id]?.ids ?? [] })),
  ];

  return columnEntries.map(({ columnValue, ids }) => {
    const orderMap = new Map(ids.map((id, index) => [id, index]));

    const cardsWithExistingOrder: T[] = [];
    const newCards: T[] = [];

    for (const item of items) {
      const itemColumn = pivotPath ? (item[pivotPath as keyof T] as string | undefined) : undefined;
      const isValidColumn = itemColumn != null && validColumnValues.has(itemColumn);
      const belongsInColumn = columnValue === UNCATEGORIZED_VALUE ? !isValidColumn : itemColumn === columnValue;

      if (belongsInColumn) {
        (orderMap.has(item.id) ? cardsWithExistingOrder : newCards).push(item);
      }
    }

    // Preserve saved order; items not in saved order go to the end.
    cardsWithExistingOrder.sort((a, b) => {
      const indexA = orderMap.get(a.id) ?? Infinity;
      const indexB = orderMap.get(b.id) ?? Infinity;
      return indexA - indexB;
    });

    return { columnValue, cards: [...cardsWithExistingOrder, ...newCards] };
  });
};
