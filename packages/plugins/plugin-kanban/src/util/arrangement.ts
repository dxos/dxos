//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { type SelectOption } from '@dxos/echo/internal';

import {
  type ArrangedCards,
  type BaseKanbanItem,
  type ColumnStructure,
  type Kanban,
  UNCATEGORIZED_VALUE,
} from '../types';

/**
 * Returns effective column order.
 */
export const getEffectiveArrangementOrder = (kanban: Kanban.Kanban | Obj.Snapshot<Kanban.Kanban>): string[] => {
  const order = kanban.arrangement?.order;
  if (order && order.length > 0) {
    return [...order];
  }
  return [];
};

/**
 * Returns effective per-column ids.
 * Always returns mutable copies so schema readonly does not leak.
 */
export const getEffectiveArrangementByColumn = (
  kanban: Kanban.Kanban | Obj.Snapshot<Kanban.Kanban>,
): Record<string, { ids: string[]; hidden?: boolean }> => {
  const columns = kanban.arrangement?.columns;
  if (columns && Object.keys(columns).length > 0) {
    return Object.fromEntries(
      Object.entries(columns).map(([key, entry]) => [
        key,
        { ids: [...(entry.ids ?? [])], ...(entry.hidden !== undefined && { hidden: entry.hidden }) },
      ]),
    );
  }
  return {};
};

/** Arrangement shape (order + columns) for helper inputs. */
type ArrangementLike =
  | {
      order?: readonly string[];
      columns?: Readonly<Record<string, { ids?: readonly string[]; hidden?: boolean }>>;
    }
  | undefined;

/**
 * Returns effective column order from arrangement; empty when arrangement has no order.
 */
export const getEffectiveOrderFromArrangement = (arrangement: ArrangementLike): string[] => {
  const order = arrangement?.order;
  if (order != null && order.length > 0) {
    return [...order];
  }
  return [];
};

/**
 * Returns effective per-column ids from arrangement; empty when arrangement has no columns.
 * Always returns mutable copies.
 */
export const getEffectiveByColumnFromArrangement = (
  arrangement: ArrangementLike,
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
 * Builds ordered column structure from effective order + byColumn + selectOptions.
 * Ensures uncategorized first, then order from arrangement.order, then any selectOption columns not yet present.
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

export const computeArrangement = <T extends BaseKanbanItem = { id: string }>({
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
  const byColumn = getEffectiveArrangementByColumn(object);

  const genColumns = function* (): Iterable<{ columnValue: string; ids: readonly string[] }> {
    yield {
      columnValue: UNCATEGORIZED_VALUE,
      ids: (byColumn[UNCATEGORIZED_VALUE]?.ids ?? []) as readonly string[],
    };

    for (const option of selectOptions) {
      if (option.id === UNCATEGORIZED_VALUE) {
        continue;
      }

      yield {
        columnValue: option.id,
        ids: (byColumn[option.id]?.ids ?? []) as readonly string[],
      };
    }
  };

  return Array.from(genColumns()).map(({ columnValue, ids }) => {
    const orderMap = new Map(ids.map((id, index) => [id, index]));

    const cardsWithExistingOrder: T[] = [];
    const newCards: T[] = [];

    for (const item of items) {
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

    return { columnValue, cards: [...cardsWithExistingOrder, ...newCards] };
  });
};
