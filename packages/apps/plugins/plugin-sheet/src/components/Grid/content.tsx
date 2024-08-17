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
  cursor?: CellPosition;
  setCursor: (cell: CellPosition | undefined) => void;

  // Selection range.
  range?: CellRange;
  setRange: (range: CellRange | undefined) => void;

  // Editing state (undefined if not editing).
  text?: string;
  setText: (text: string | undefined) => void;
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

export const GridContextProvider = ({ children, readonly, sheet }: PropsWithChildren<GridContextProps>) => {
  const model = useMemo(() => new SheetModel(sheet), [readonly, sheet]);
  const [cursor, setCursor] = useState<CellPosition>();
  const [range, setRange] = useState<CellRange>();
  const [text, setText] = useState<string>();

  return (
    <GridContext.Provider
      value={{
        //
        model,
        //
        cursor,
        setCursor,
        //
        range,
        setRange,
        //
        text,
        setText,
      }}
    >
      {children}
    </GridContext.Provider>
  );
};
