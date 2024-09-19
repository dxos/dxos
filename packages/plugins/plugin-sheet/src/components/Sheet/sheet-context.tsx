//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useState, useEffect, useMemo } from 'react';

import { invariant } from '@dxos/invariant';
import { type FunctionType } from '@dxos/plugin-script';
import { fullyQualifiedId, type Space } from '@dxos/react-client/echo';

import { createDecorations } from './decorations';
import { FormattingModel } from './formatting';
import { type CellAddress, type CellRange, defaultFunctions, SheetModel } from '../../model';
import { type SheetType } from '../../types';
import { type FunctionContextOptions } from '../ComputeGraph';
// TODO(wittjosiah): Refactor. This is not exported from ./components due to depending on ECHO.
import { useComputeGraph } from '../ComputeGraph/graph-context';

// TODO(wittjosiah): Factor out.
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 26 (object id) + 1 (separator).

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

/**
 * Map from binding to fully qualified ECHO ID.
 */
const mapFormulaBindingToId =
  (functions: FunctionType[]) =>
  (formula: string): string => {
    return formula.replace(/([a-zA-Z0-9]+)\((.*)\)/g, (match, binding, args) => {
      if (defaultFunctions.find((fn) => fn.name === binding) || binding === 'EDGE') {
        return match;
      }

      const fn = functions.find((fn) => fn.binding === binding);
      if (fn) {
        return `${fullyQualifiedId(fn)}(${args})`;
      } else {
        return match;
      }
    });
  };

/**
 * Map from fully qualified ECHO ID to binding.
 */
const mapFormulaBindingFromId =
  (functions: FunctionType[]) =>
  (formula: string): string => {
    return formula.replace(/([a-zA-Z0-9]+):([a-zA-Z0-9]+)\((.*)\)/g, (match, spaceId, objectId, args) => {
      const id = `${spaceId}:${objectId}`;
      if (id.length !== OBJECT_ID_LENGTH) {
        return match;
      }

      const fn = functions.find((fn) => fullyQualifiedId(fn) === id);
      if (fn?.binding) {
        return `${fn.binding}(${args})`;
      } else {
        return match;
      }
    });
  };

export const SheetContextProvider = ({
  children,
  sheet,
  space,
  readonly,
  onInfo,
  ...options
}: PropsWithChildren<SheetContextProps>) => {
  const graph = useComputeGraph(space, options);

  const [cursor, setCursor] = useState<CellAddress>();
  const [range, setRange] = useState<CellRange>();
  const [editing, setEditing] = useState<boolean>(false);
  const decorations = useMemo(() => createDecorations(), []);

  const [[model, formatting] = [], setModels] = useState<[SheetModel, FormattingModel] | undefined>(undefined);
  useEffect(() => {
    let model: SheetModel | undefined;
    let formatting;
    const t = setTimeout(async () => {
      model = new SheetModel(graph, sheet, space, { readonly, mapFormulaBindingToId, mapFormulaBindingFromId });
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
        decorations,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};
