//
// Copyright 2024 DXOS.org
//

import { type BaseKanbanItem, type KanbanType } from './defs';
import { UNCATEGORIZED_VALUE } from './defs';

export const computeArrangement = <T extends BaseKanbanItem = { id: string }>(kanban: KanbanType, items: T[]) => {
  const pivotField = kanban.columnField;
  const kanbanArrangement = kanban.arrangement;
  if (pivotField) {
    // Start with uncategorized column
    const baseArrangement = [{ columnValue: UNCATEGORIZED_VALUE, ids: [] }];

    // Add other columns from arrangement or derive from items
    const otherColumns = (
      kanbanArrangement ??
      Array.from(
        items.reduce((acc, item) => {
          const columnValue = item[pivotField as keyof typeof item];
          if (columnValue) {
            acc.add(`${columnValue}`);
          }
          return acc;
        }, new Set<string>()),
      ).map((columnValue) => ({ columnValue, ids: [] }))
    ).filter(({ columnValue }) => columnValue !== UNCATEGORIZED_VALUE);

    return [...baseArrangement, ...otherColumns].map(({ columnValue, ids }) => {
      const orderMap = new Map(ids.map((id, index) => [id, index]));

      const prioritizedItems: T[] = [];
      const remainingItems: T[] = [];

      // Categorize items
      for (const item of items) {
        const itemColumn = item[pivotField as keyof typeof item];
        const belongsInColumn = columnValue === UNCATEGORIZED_VALUE ? !itemColumn : itemColumn === columnValue;

        if (belongsInColumn) {
          if (orderMap.has(item.id)) {
            prioritizedItems.push(item);
          } else {
            remainingItems.push(item);
          }
        }
      }

      prioritizedItems.sort((a, b) => {
        const indexA = orderMap.get(a.id) ?? Infinity;
        const indexB = orderMap.get(b.id) ?? Infinity;
        return indexA - indexB;
      });

      return { columnValue, cards: [...prioritizedItems, ...remainingItems] };
    });
  }
  return [];
};
