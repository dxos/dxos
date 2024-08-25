//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';

import { FormattingModel } from './formatting';
import { type CellAddress, type CellRange, SheetModel } from '../../model';
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
};

export const SheetContextProvider = ({ children, sheet, readonly }: PropsWithChildren<SheetContextProps>) => {
  const model = useMemo(() => new SheetModel(sheet), [sheet, readonly]);
  const formatting = useMemo(() => new FormattingModel(model), [model]);
  const [cursor, setCursor] = useState<CellAddress>();
  const [range, setRange] = useState<CellRange>();
  const [editing, setEditing] = useState<boolean>(false);

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
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};
