//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useState, useMemo } from 'react';

import { invariant } from '@dxos/invariant';
import { type Space } from '@dxos/react-client/echo';

import { createDecorations } from './decorations';
import { useSheetModel } from './util';
import { type CellAddress, type CellRange, type SheetModel, type FormattingModel } from '../../model';
import { type SheetType } from '../../types';
import { type FunctionContextOptions } from '../ComputeGraph';
// TODO(wittjosiah): Refactor. This is not exported from ./components due to depending on ECHO.

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
  sheet: SheetType;
  space: Space;
  readonly?: boolean;
} & Pick<SheetContextType, 'onInfo'> &
  Partial<FunctionContextOptions>;

export const SheetContextProvider = ({
  children,
  sheet,
  space,
  readonly,
  onInfo,
  ...options
}: PropsWithChildren<SheetContextProps>) => {
  const { model, formatting } = useSheetModel({ sheet, space, readonly, options });
  // TODO(Zan): We should offer a version of set range and set cursor that scrolls to
  // that cell or range if it is not visible.
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
