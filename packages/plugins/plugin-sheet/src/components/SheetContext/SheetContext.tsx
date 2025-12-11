//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useCallback, useContext, useState } from 'react';

import { type CellAddress, type CellRange, type CompleteCellRange, type ComputeGraph } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import {
  Grid,
  type GridContentProps,
  type GridEditing,
  type GridScopedProps,
  useGridContext,
} from '@dxos/react-ui-grid';

import { type SheetModel, useSheetModel } from '../../model';
import { type Sheet } from '../../types';

export type SheetContextValue = {
  id: string;

  model: SheetModel;

  // Cursor state.
  // TODO(burdon): Cursor and range should use indices.
  cursor?: CellAddress;
  setCursor: (cell: CellAddress | undefined) => void;
  range?: CellRange;
  setRange: (range: CellRange | undefined) => void;
  cursorFallbackRange?: CompleteCellRange;

  // Editing state (undefined if not editing).
  editing: GridEditing;
  setEditing: (editing: GridEditing) => void;

  // Active refs
  activeRefs: GridContentProps['activeRefs'];
  setActiveRefs: (activeRefs: GridContentProps['activeRefs']) => void;

  // Events.
  // TODO(burdon): Generalize.
  onInfo?: () => void;

  // Flags
  ignoreAttention?: boolean;
};

const SheetContext = createContext<SheetContextValue | undefined>(undefined);

export const useSheetContext = (): SheetContextValue => {
  const context = useContext(SheetContext);
  invariant(context);
  return context;
};

const SheetProviderImpl = ({
  __gridScope,
  children,
  ignoreAttention,
  model,
  onInfo,
}: GridScopedProps<PropsWithChildren<Pick<SheetContextValue, 'ignoreAttention' | 'model' | 'onInfo'>>>) => {
  const { id, editing, setEditing } = useGridContext('SheetProvider', __gridScope);

  const [cursor, setCursorInternal] = useState<CellAddress>();
  const [range, setRangeInternal] = useState<CellRange>();
  const [cursorFallbackRange, setCursorFallbackRange] = useState<CompleteCellRange>();
  const [activeRefs, setActiveRefs] = useState<GridContentProps['activeRefs']>('');

  const setCursor = useCallback(
    (nextCursor?: CellAddress) => {
      setCursorInternal(nextCursor);
      setCursorFallbackRange(
        range?.to ? (range as CompleteCellRange) : nextCursor ? { from: nextCursor!, to: nextCursor! } : undefined,
      );
    },
    [range],
  );
  const setRange = useCallback(
    (nextRange?: CellRange) => {
      setRangeInternal(nextRange);
      setCursorFallbackRange(
        nextRange?.to ? (nextRange as CompleteCellRange) : cursor ? { from: cursor!, to: cursor! } : undefined,
      );
    },
    [cursor],
  );

  return (
    <SheetContext.Provider
      value={{
        id,
        model,
        editing,
        setEditing,
        cursor,
        setCursor,
        range,
        setRange,
        cursorFallbackRange,
        activeRefs,
        setActiveRefs,
        // TODO(burdon): Change to event.
        onInfo,
        ignoreAttention,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};

export type SheetProviderProps = {
  graph: ComputeGraph;
  sheet: Sheet.Sheet;
  readonly?: boolean;
  ignoreAttention?: boolean;
} & Pick<SheetContextValue, 'onInfo'>;

export const SheetProvider = ({
  children,
  graph,
  sheet,
  readonly,
  ignoreAttention,
  onInfo,
}: PropsWithChildren<SheetProviderProps>) => {
  const model = useSheetModel(graph, sheet, { readonly });

  return !model ? null : (
    <Grid.Root id={Obj.getDXN(sheet).toString()}>
      <SheetProviderImpl model={model} onInfo={onInfo} ignoreAttention={ignoreAttention}>
        {children}
      </SheetProviderImpl>
    </Grid.Root>
  );
};
