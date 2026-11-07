//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type PropsWithChildren, useMemo, useState } from 'react';

import {
  type CellAddress,
  type CellRange,
  type CompleteCellRange,
  type ComputeGraph,
} from '@dxos/compute-hyperformula';
import { useObject } from '@dxos/echo-react';
import {
  Grid,
  type GridAddressing,
  type GridAwareness,
  type GridContentProps,
  type GridEditing,
  toRange,
  useGridContext,
} from '@dxos/react-ui-grid';

import { Sheet } from '#types';

import { type SheetModel, useSheetModel } from '../../model/index.ts';
import { SheetContext } from './SheetContext.ts';

export type SheetContextValue = {
  id: string;
  attendableId: string;
  model: SheetModel;

  // Cursor state, read from the grid's shared selection: the focused cell, and the range when it spans several.
  addressing: GridAddressing;
  cursor?: CellAddress;
  range?: CellRange;
  cursorFallbackRange?: CompleteCellRange;

  // Editing state (undefined if not editing).
  editing: GridEditing;
  setEditing: (editing: GridEditing) => void;

  // Active refs
  activeRefs: GridContentProps['activeRefs'];
  setActiveRefs: (activeRefs: GridContentProps['activeRefs']) => void;

  // Flags
  ignoreAttention?: boolean;

  // Events.
  // TODO(burdon): Generalize.
  onInfo?: () => void;
};

export type SheetRootProps = {
  graph: ComputeGraph;
  sheet: Sheet.Sheet;
  attendableId: string;
  readonly?: boolean;
  ignoreAttention?: boolean;
  awareness?: GridAwareness;
} & Pick<SheetContextValue, 'onInfo'>;

export const SheetRoot = ({
  children,
  graph,
  sheet,
  attendableId,
  readonly,
  ignoreAttention,
  awareness,
  onInfo,
}: PropsWithChildren<SheetRootProps>) => {
  const model = useSheetModel(graph, sheet, { readonly });
  if (!model) {
    return null;
  }

  return (
    <Grid.Root id={attendableId} awareness={awareness}>
      <SheetProviderImpl model={model} attendableId={attendableId} onInfo={onInfo} ignoreAttention={ignoreAttention}>
        {children}
      </SheetProviderImpl>
    </Grid.Root>
  );
};

const SheetProviderImpl = ({
  children,
  attendableId,
  ignoreAttention,
  model,
  onInfo,
}: PropsWithChildren<Pick<SheetContextValue, 'attendableId' | 'ignoreAttention' | 'model' | 'onInfo'>>) => {
  const { id, editing, setEditing, selection } = useGridContext('SheetProvider');
  const [activeRefs, setActiveRefs] = useState<GridContentProps['activeRefs']>('');

  // Cells are named by the sheet's row and column ids, so a selection stays on its cells as rows and columns move.
  const [rows] = useObject(model.sheet, 'rows');
  const [columns] = useObject(model.sheet, 'columns');
  const addressing = useMemo(() => createAddressing(rows ?? [], columns ?? []), [rows, columns]);

  const local = useAtomValue(selection.local);
  const { cursor, range, cursorFallbackRange } = useMemo(() => {
    const localRange = local && toRange(addressing, local);
    if (!localRange) {
      return {};
    }

    const { start, end } = localRange;
    const from = { col: Math.min(start.col, end.col), row: Math.min(start.row, end.row) };
    const to = { col: Math.max(start.col, end.col), row: Math.max(start.row, end.row) };
    return {
      cursor: { col: start.col, row: start.row },
      range: from.col !== to.col || from.row !== to.row ? { from, to } : undefined,
      cursorFallbackRange: { from, to },
    };
  }, [addressing, local]);

  return (
    <SheetContext.Provider
      value={{
        id,
        attendableId,
        model,
        editing,
        setEditing,
        addressing,
        cursor,
        range,
        cursorFallbackRange,
        activeRefs,
        setActiveRefs,
        ignoreAttention,
        // TODO(burdon): Change to event.
        onInfo,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};

const createAddressing = (rows: readonly string[], columns: readonly string[]): GridAddressing => {
  const rowIndex = new Map(rows.map((id, index) => [id, index]));
  const columnIndex = new Map(columns.map((id, index) => [id, index]));
  return {
    toId: ({ plane, col, row }) =>
      plane === 'grid' && columns[col] && rows[row] ? { col: columns[col], row: rows[row] } : undefined,
    toPosition: ({ col, row }) => {
      const colIndex = columnIndex.get(col);
      const index = rowIndex.get(row);
      return colIndex === undefined || index === undefined ? undefined : { plane: 'grid', col: colIndex, row: index };
    },
  };
};
