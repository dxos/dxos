//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { SheetModel } from '../../model';
import type { SheetType } from '../../types';

type GridContextType = {
  model: SheetModel;
};

const GridContext = createContext<GridContextType | null>(null);

export const useGridContext = (): GridContextType => {
  return useContext(GridContext)!;
};

export type GridContextProps = {
  sheet: SheetType;
  readonly?: boolean;
};

export const GridContextProvider = ({ children, readonly, sheet }: PropsWithChildren<GridContextProps>) => {
  const model = useMemo(() => new SheetModel(sheet), [readonly, sheet]);

  return <GridContext.Provider value={{ model }}>{children}</GridContext.Provider>;
};
