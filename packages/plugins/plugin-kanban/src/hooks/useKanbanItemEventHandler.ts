//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import type { BoardModel, MosaicEventHandler, MosaicTileData } from '@dxos/react-ui-mosaic';

import { UNCATEGORIZED_VALUE } from '../types';
import { type ArrangedCards, type BaseKanbanItem, type ColumnStructure, type KanbanChangeCallback } from '../util';

function findColumn<T extends BaseKanbanItem>(
  id: string,
  arrangement: ArrangedCards<T>,
): { columnValue: string; cards: T[] } | undefined {
  return arrangement.find(({ columnValue, cards }) => columnValue === id || cards.some((card) => card.id === id));
}

export function useKanbanItemEventHandler<T extends BaseKanbanItem>({
  column,
  columnFieldPath,
  model,
  change,
}: {
  column: ColumnStructure;
  columnFieldPath: string | undefined;
  model: BoardModel<ColumnStructure, T>;
  change: KanbanChangeCallback<T>;
}): MosaicEventHandler<T> {
  return useMemo<MosaicEventHandler<T>>(
    () => ({
      id: column.columnValue,
      canDrop: ({ source }) => model.isItem(source.data),
      onTake: ({ source }, cb) => {
        void cb(source.data as T);
      },
      onDrop: ({ source, target }) => {
        // 1. Snapshot current arrangement from model (read-only).
        const columns = model.getColumns();
        const currentArrangement: ArrangedCards<T> = columns.map((col) => ({
          columnValue: col.columnValue,
          cards: model.getItems(col) ?? [],
        }));
        const sourceColumnInSnapshot = findColumn(source.id, currentArrangement);
        if (!sourceColumnInSnapshot) {
          return;
        }

        // 2. Working copy to mutate, then persist.
        const workingArrangement = currentArrangement.map((col) => ({
          columnValue: col.columnValue,
          cards: [...col.cards],
        }));
        const sourceColumnInWorking = workingArrangement.find(
          (c) => c.columnValue === sourceColumnInSnapshot.columnValue || c.cards.some((card) => card.id === source.id),
        );
        const targetColumnInWorking = workingArrangement.find((c) => c.columnValue === column.columnValue);
        if (!sourceColumnInWorking || !targetColumnInWorking) {
          return;
        }

        // 3. Remove card from source column in working copy.
        const sourceIndex = sourceColumnInWorking.cards.findIndex((card) => card.id === source.id);
        if (sourceIndex === -1) {
          return;
        }
        const [movedCard] = sourceColumnInWorking.cards.splice(sourceIndex, 1);

        // 4. Update card's pivot field to target column value.
        if (columnFieldPath !== undefined) {
          const newValue =
            targetColumnInWorking.columnValue === UNCATEGORIZED_VALUE ? undefined : targetColumnInWorking.columnValue;
          change.setItemField(movedCard, columnFieldPath, newValue);
        }

        // 5. Compute insert index in target column, then insert.
        const existingTargetIndex =
          target?.type === 'tile'
            ? targetColumnInWorking.cards.findIndex(
                (card) => model.getItemId(card) === (target as MosaicTileData<T>).id,
              )
            : -1;
        const closestEdge: 'top' | 'bottom' =
          target?.type === 'placeholder' && typeof target.location === 'number'
            ? target.location <= targetColumnInWorking.cards.length / 2
              ? 'top'
              : 'bottom'
            : 'bottom';

        let insertIndex: number;
        if (target?.type === 'placeholder' && typeof target.location === 'number') {
          insertIndex = Math.max(0, Math.min(targetColumnInWorking.cards.length, Math.floor(target.location)));
        } else if (target?.type === 'container' || existingTargetIndex === -1) {
          insertIndex = targetColumnInWorking.cards.length;
        } else if (sourceColumnInWorking.columnValue === targetColumnInWorking.columnValue) {
          insertIndex = closestEdge === 'bottom' ? existingTargetIndex + 1 : existingTargetIndex;
          if (sourceIndex < existingTargetIndex) {
            insertIndex -= 1;
          }
        } else {
          insertIndex = closestEdge === 'bottom' ? existingTargetIndex + 1 : existingTargetIndex;
        }
        targetColumnInWorking.cards.splice(insertIndex, 0, movedCard);

        // 6. Persist arrangement to kanban.
        change.kanban((kanban) => {
          kanban.arrangement = {
            order: workingArrangement.map(({ columnValue }) => columnValue),
            columns: Object.fromEntries(
              workingArrangement.map(({ columnValue, cards }) => [columnValue, { ids: cards.map((c) => c.id) }]),
            ),
          };
        });
      },
    }),
    [column, columnFieldPath, model, change],
  );
}
