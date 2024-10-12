//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';

import { type CellAddress, type CellRange } from '../../defs';
import { type ComputeGraph } from '../../graph';
import { useSheetModel, useFormattingModel } from '../../hooks';
import { type FormattingModel, type SheetModel, createDecorations } from '../../model';
import { type SheetType } from '../../types';

export type SheetContextType = {
  model: SheetModel;
  formatting: FormattingModel;

  // Cursor state.
  // TODO(burdon): Cursor and range should use indices.
  cursor?: CellAddress;
  setCursor: (cell: CellAddress | undefined) => void;
  range?: CellRange;
  setRange: (range: CellRange | undefined) => void;

  // Editing state (undefined if not editing).
  editing: boolean;
  setEditing: (editing: boolean) => void;

  // Events.
  // TODO(burdon): Generalize.
  onInfo?: () => void;

  // Decorations.
  decorations: ReturnType<typeof createDecorations>;
};

const SheetContext = createContext<SheetContextType | null>(null);

export const useSheetContext = (): SheetContextType => {
  const context = useContext(SheetContext);
  invariant(context);
  return context;
};

export type SheetContextProps = {
  graph: ComputeGraph;
  sheet: SheetType;
  readonly?: boolean;
} & Pick<SheetContextType, 'onInfo'>;

export const SheetProvider = ({ children, graph, sheet, readonly, onInfo }: PropsWithChildren<SheetContextProps>) => {
  const model = useSheetModel(graph, sheet, { readonly });
  const formatting = useFormattingModel(model);

  // TODO(Zan): Impl. set range and set cursor that scrolls to that cell or range if it is not visible.
  const [cursor, setCursor] = useState<CellAddress>();
  const [range, setRange] = useState<CellRange>();
  const [editing, setEditing] = useState<boolean>(false);
  const decorations = useMemo(() => createDecorations(), []);

  return !model || !formatting ? null : (
    <SheetContext.Provider
      value={{
        model,
        formatting,
        cursor,
        setCursor,
        range,
        setRange,
        editing,
        setEditing,
        // TODO(burdon): Change to event.
        onInfo,
        decorations,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};
