//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState, useEffect } from 'react';

import { invariant } from '@dxos/invariant';

import { FormattingModel } from './formatting';
import { type CellAddress, type CellRange, SheetModel } from '../../model';
import { type SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';

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
};

const SheetContext = createContext<SheetContextType | null>(null);

export const useSheetContext = (): SheetContextType => {
  const context = useContext(SheetContext);
  invariant(context);
  return context;
};

export type SheetContextProps = {
  sheet: SheetType;
  readonly?: boolean;
} & Pick<SheetContextType, 'onInfo'>;

export const SheetContextProvider = ({ children, sheet, readonly, onInfo }: PropsWithChildren<SheetContextProps>) => {
  const graph = useComputeGraph();
  const model = useMemo(() => new SheetModel(graph, sheet), [graph, sheet, readonly]);
  const formatting = useMemo(() => new FormattingModel(model), [model]);
  const [cursor, setCursor] = useState<CellAddress>();
  const [range, setRange] = useState<CellRange>();
  const [editing, setEditing] = useState<boolean>(false);
  useEffect(() => {
    void model.initialize();
    return () => {
      void model.destroy();
    };
  }, [model]);

  return (
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
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};
