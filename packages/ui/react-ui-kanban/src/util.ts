//
// Copyright 2025 DXOS.org
//

import { type SelectOption } from '@dxos/echo/internal';

import { type BaseKanbanItem, UNCATEGORIZED_VALUE } from './model';
import { type Kanban } from './types';

export const computeArrangement = <T extends BaseKanbanItem = { id: string }>({
  kanban,
  items,
  pivotPath,
  selectOptions,
}: {
  kanban: Kanban.Kanban;
  items: T[];
  pivotPath?: string;
  selectOptions: SelectOption[];
}) => {
  // Get valid column values from select options
  const validColumnValues = new Set(selectOptions.map((opt) => opt.id));

  const genColumns = function* (): Iterable<{ columnValue: string; ids: readonly string[] }> {
    // Start with uncategorized, using existing item arrangement if present.
    yield kanban.arrangement?.find((col) => col.columnValue === UNCATEGORIZED_VALUE) ?? {
      columnValue: UNCATEGORIZED_VALUE,
      ids: [] as const,
    };

    // Follow select options order, using existing item arrangement if present.
    for (const option of selectOptions) {
      if (option.id === UNCATEGORIZED_VALUE) {
        continue;
      }

      yield kanban.arrangement?.find((col) => col.columnValue === option.id) ?? {
        columnValue: option.id,
        ids: [] as const,
      };
    }
  };

  return Array.from(genColumns()).map(({ columnValue, ids }) => {
    const orderMap = new Map(ids.map((id, index) => [id, index]));

    const cardsWithExistingOrder: T[] = [];
    const newCards: T[] = [];

    // Categorize items
    for (const item of items) {
      const itemColumn = item[pivotPath as keyof typeof item];

      // TODO(ZaymonFC): Watch this cast. It's a hack.
      const isValidColumn = itemColumn && validColumnValues.has(itemColumn as any as string);
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
