//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';

import { type CellPosition, type CellRange, SheetModel } from '../../model';
import { type SheetType } from '../../types';

export type GridContextType = {
  model: SheetModel;

  // Cursor state.
  // TODO(burdon): Cursor and range should use indices.
  cursor?: CellPosition;
  setCursor: (cell: CellPosition | undefined) => void;
  range?: CellRange;
  setRange: (range: CellRange | undefined) => void;

  // Editing state (undefined if not editing).
  editing: boolean;
  setEditing: (editing: boolean) => void;
};

const GridContext = createContext<GridContextType | null>(null);

export const useGridContext = (): GridContextType => {
  const context = useContext(GridContext);
  invariant(context);
  return context;
};

export type GridContextProps = {
  sheet: SheetType;
  readonly?: boolean;
};

export const GridContextProvider = ({ children, sheet, readonly }: PropsWithChildren<GridContextProps>) => {
  const model = useMemo(() => new SheetModel(sheet), [sheet, readonly]);
  const [cursor, setCursor] = useState<CellPosition>();
  const [range, setRange] = useState<CellRange>();
  const [editing, setEditing] = useState<boolean>(false);

  return (
    <GridContext.Provider
      value={{
        //
        model,
        //
        cursor,
        setCursor,
        range,
        setRange,
        //
        editing,
        setEditing,
      }}
    >
      {children}
    </GridContext.Provider>
  );
};
