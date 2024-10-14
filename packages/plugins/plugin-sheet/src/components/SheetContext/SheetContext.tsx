//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Grid, useGridContext, type GridScopedProps, type GridEditing } from '@dxos/react-ui-grid';

import { type CellAddress, type CellRange } from '../../defs';
import { type ComputeGraph } from '../../graph';
import { useSheetModel, useFormattingModel, useSelectThreadOnCellFocus, useThreadDecorations } from '../../hooks';
import { type FormattingModel, type SheetModel, createDecorations } from '../../model';
import { type SheetType } from '../../types';

export type SheetContextValue = {
  id: string;

  model: SheetModel;
  formatting: FormattingModel;

  // Cursor state.
  // TODO(burdon): Cursor and range should use indices.
  cursor?: CellAddress;
  setCursor: (cell: CellAddress | undefined) => void;
  range?: CellRange;
  setRange: (range: CellRange | undefined) => void;

  // Editing state (undefined if not editing).
  editing: GridEditing;
  setEditing: (editing: GridEditing) => void;

  // Events.
  // TODO(burdon): Generalize.
  onInfo?: () => void;

  // Decorations.
  decorations: ReturnType<typeof createDecorations>;
};

const SheetContext = createContext<SheetContextValue | null>(null);

export const useSheetContext = (): SheetContextValue => {
  const context = useContext(SheetContext);
  invariant(context);
  return context;
};

const SheetProviderImpl = ({
  model,
  formatting,
  onInfo,
  children,
  __gridScope,
}: GridScopedProps<PropsWithChildren<Pick<SheetContextValue, 'onInfo' | 'model' | 'formatting'>>>) => {
  const { id, editing, setEditing } = useGridContext('SheetProvider', __gridScope);

  // TODO(Zan): Impl. set range and set cursor that scrolls to that cell or range if it is not visible.
  const decorations = useMemo(() => createDecorations(), []);

  // TODO(thure): Reconnect these.
  const [cursor, setCursor] = useState<CellAddress>();
  const [range, setRange] = useState<CellRange>();

  useSelectThreadOnCellFocus(model, cursor);
  useThreadDecorations(model, decorations);

  return (
    <SheetContext.Provider
      value={{
        id,
        model,
        formatting,
        editing,
        setEditing,
        cursor,
        setCursor,
        range,
        setRange,
        // TODO(burdon): Change to event.
        onInfo,
        decorations,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};

export type SheetProviderProps = {
  graph: ComputeGraph;
  sheet: SheetType;
  readonly?: boolean;
} & Pick<SheetContextValue, 'onInfo'>;

export const SheetProvider = ({ children, graph, sheet, readonly, onInfo }: PropsWithChildren<SheetProviderProps>) => {
  const model = useSheetModel(graph, sheet, { readonly });
  const formatting = useFormattingModel(model);

  return !model || !formatting ? null : (
    <Grid.Root id={fullyQualifiedId(sheet)}>
      <SheetProviderImpl model={model} formatting={formatting} onInfo={onInfo}>
        {children}
      </SheetProviderImpl>
    </Grid.Root>
  );
};
