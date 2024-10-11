//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';
import {
  Grid,
  type GridScopedProps,
  useGridContext,
  type GridContextValue,
  type DxGridPositionNullable,
} from '@dxos/react-ui-grid';

import { type CellRange } from '../defs';
import { type ComputeGraph } from '../graph';
import { useSheetModel, useFormattingModel } from '../hooks';
import { type FormattingModel, type SheetModel, createDecorations, type Decorations } from '../model';
import { type SheetType } from '../types';

export type SheetContextType = {
  model: SheetModel;
  formatting: FormattingModel;

  // Cursor state.
  // TODO(burdon): Cursor and range should use indices.
  cursor?: DxGridPositionNullable;
  setCursor: (position: DxGridPositionNullable | undefined) => void;
  range?: CellRange;
  setRange: (range: CellRange | undefined) => void;

  // Events.
  // TODO(burdon): Generalize.
  onInfo?: () => void;

  // Decorations.
  decorations: Decorations;
} & GridContextValue;

const SheetContext = createContext<SheetContextType | null>(null);

export const useSheetContext = (): SheetContextType => {
  const context = useContext(SheetContext);
  invariant(context);
  return context;
};

export type SheetContextProps = {
  graph?: ComputeGraph;
  sheet?: SheetType;
  readonly?: boolean;
} & Pick<SheetContextType, 'onInfo'>;

export type SheetProviderProps = PropsWithChildren<SheetContextProps>;

const SheetProviderImpl = ({
  model,
  formatting,
  children,
  onInfo,
  __gridScope,
}: GridScopedProps<
  Omit<SheetProviderProps, 'graph' | 'sheet'> & { model: SheetModel; formatting: FormattingModel }
>) => {
  const { id, editing, setEditing, editBox, setEditBox } = useGridContext('SheetProvider', __gridScope);

  // TODO(Zan): Impl. set range and set cursor that scrolls to that cell or range if it is not visible.
  const [cursor, setCursor] = useState<DxGridPositionNullable>();
  const [range, setRange] = useState<CellRange>();
  const decorations = useMemo(() => createDecorations(), []);

  return (
    <SheetContext.Provider
      value={{
        id,
        model,
        formatting,
        cursor,
        setCursor,
        range,
        setRange,
        editing,
        setEditing,
        editBox,
        setEditBox,
        // TODO(burdon): Change to event.
        onInfo,
        decorations,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};

export const SheetProvider = ({ children, graph, sheet, readonly, onInfo }: SheetProviderProps) => {
  const model = useSheetModel(graph, sheet, { readonly });
  const formatting = useFormattingModel(model);

  if (!model || !formatting) {
    return null;
  }

  return !model || !formatting ? null : (
    <Grid.Root id={model.id}>
      <SheetProviderImpl model={model} formatting={formatting} onInfo={onInfo}>
        {children}
      </SheetProviderImpl>
    </Grid.Root>
  );
};
