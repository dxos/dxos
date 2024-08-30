//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useState, useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { type Space } from '@dxos/react-client/echo';

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
  space: Space;
  readonly?: boolean;
} & Pick<SheetContextType, 'onInfo'>;

export const SheetContextProvider = ({
  children,
  sheet,
  space,
  readonly,
  onInfo,
}: PropsWithChildren<SheetContextProps>) => {
  const graph = useComputeGraph(space);

  const [cursor, setCursor] = useState<CellAddress>();
  const [range, setRange] = useState<CellRange>();
  const [editing, setEditing] = useState<boolean>(false);

  const [[model, formatting] = [], setModels] = useState<[SheetModel, FormattingModel] | undefined>(undefined);
  useEffect(() => {
    let model: SheetModel | undefined;
    let formatting;
    const t = setTimeout(async () => {
      model = new SheetModel(graph, sheet, { readonly });
      await model.initialize();
      formatting = new FormattingModel(model);
      setModels([model, formatting]);
    });

    return () => {
      clearTimeout(t);
      void model?.destroy();
    };
  }, [graph, readonly]);

  if (!model || !formatting) {
    return null;
  }

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
