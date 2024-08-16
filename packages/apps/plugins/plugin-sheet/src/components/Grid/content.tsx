//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';

import { type CellPosition, SheetModel } from '../../model';
import { type SheetType } from '../../types';

export type GridContextType = {
  model: SheetModel;
  cursor?: CellPosition;
  setCursor: (cell: CellPosition | undefined) => void;
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

  return <GridContext.Provider value={{ model, cursor, setCursor }}>{children}</GridContext.Provider>;
};
