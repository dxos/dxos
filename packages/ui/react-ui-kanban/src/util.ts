//
// Copyright 2024 DXOS.org
//

import { type BaseKanbanItem, type KanbanType } from './defs';

export const computeArrangement = <T extends BaseKanbanItem = { id: string }>(kanban: KanbanType, items: T[]) => {
  const pivotField = kanban.columnField;
  const kanbanArrangement = kanban.arrangement;
  if (pivotField) {
    return (
      kanbanArrangement ??
      Array.from(
        items.reduce((acc, item) => {
          acc.add(`${item[pivotField as keyof typeof item]}`);
          return acc;
        }, new Set<string>()),
      ).map((columnValue) => ({ columnValue, ids: [] }))
    ).map(({ columnValue, ids }) => {
      const orderMap = new Map(ids.map((id, index) => [id, index]));

      const prioritizedItems: T[] = [];
      const remainingItems: T[] = [];

      // Categorize items
      for (const item of items) {
        if (item[pivotField as keyof typeof item] === columnValue) {
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
