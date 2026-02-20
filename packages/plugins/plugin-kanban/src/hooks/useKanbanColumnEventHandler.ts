//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import type { BoardModel, MosaicEventHandler, MosaicTileData } from '@dxos/react-ui-mosaic';
import type { ProjectionModel } from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { type BaseKanbanItem, type ColumnStructure, type KanbanChangeCallback, UNCATEGORIZED_VALUE } from '../types';

/**
 * Builds the column drag-and-drop handler for the kanban board (reorder columns).
 *
 * @template T - Item type (extends BaseKanbanItem).
 * @param id - Handler id.
 * @param model - Board model for getColumns / getColumnId.
 * @param projection - ProjectionModel for pivot field options (column order).
 * @param pivotFieldId - Pivot field id; undefined disables drop.
 * @param change - Callback to persist kanban.arrangement.order.
 * @returns MosaicEventHandler for column tiles.
 */
export function useKanbanColumnEventHandler<T extends BaseKanbanItem>({
  id,
  model,
  projection,
  pivotFieldId,
  change,
}: {
  id: string;
  model: BoardModel<ColumnStructure, T>;
  projection: ProjectionModel | undefined;
  pivotFieldId: string | undefined;
  change: KanbanChangeCallback<T>;
}): MosaicEventHandler<ColumnStructure> {
  return useMemo<MosaicEventHandler<ColumnStructure>>(
    () => ({
      id,
      canDrop: ({ source }) => {
        if (!projection) {
          return false;
        }
        const data = source.data as ColumnStructure;
        const columnValue = model.getColumnId(data);
        return (
          model.isColumn(source.data) &&
          columnValue !== UNCATEGORIZED_VALUE &&
          (source as MosaicTileData<ColumnStructure>).id !== UNCATEGORIZED_VALUE
        );
      },
      onDrop: ({ source, target }) => {
        if (!projection || pivotFieldId === undefined) {
          return;
        }
        const sourceColumnData = source.data as ColumnStructure;
        const sourceColumnId = model.getColumnId(sourceColumnData);
        if (sourceColumnId === UNCATEGORIZED_VALUE) {
          return;
        }

        // 1. Current column order from model; find source index.
        const currentColumns = model.getColumns();
        const sourceIndex = currentColumns.findIndex((c) => model.getColumnId(c) === sourceColumnId);
        if (sourceIndex === -1) {
          return;
        }

        // 2. Resolve drop target to an index in the column list.
        let targetIndex: number;
        if (target?.type === 'tile' || target?.type === 'placeholder') {
          targetIndex = typeof target.location === 'number' ? Math.floor(target.location) : -1;
        } else if (target?.type === 'container') {
          targetIndex = currentColumns.length;
        } else {
          return;
        }
        if (targetIndex < 0) {
          return;
        }

        // 3. New column order after move.
        const currentColumnIds = currentColumns.map((c) => model.getColumnId(c));
        const reorderedColumnIds = arrayMove([...currentColumnIds], sourceIndex, targetIndex);

        // 4. Persist reordered options to projection (pivot field options = column order).
        const fieldProjection = projection.getFieldProjection(pivotFieldId);
        const currentOptions = [...(fieldProjection.props.options ?? [])];
        const optionsInNewOrder = reorderedColumnIds
          .map((columnId) => currentOptions.find((o) => o.id === columnId))
          .filter((o): o is NonNullable<typeof o> => o != null);

        projection.setFieldProjection({
          ...fieldProjection,
          props: { ...fieldProjection.props, options: optionsInNewOrder },
        });

        // Persist column order to kanban.arrangement so the board UI reflects the new order.
        change.kanban((kanban) => {
          kanban.arrangement.order = reorderedColumnIds.filter((columnId) => columnId !== UNCATEGORIZED_VALUE);
        });
      },
    }),
    [id, model, projection, pivotFieldId, change],
  );
}
