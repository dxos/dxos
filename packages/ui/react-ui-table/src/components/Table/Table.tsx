//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, type RefObject, forwardRef, useImperativeHandle, useRef } from 'react';

import { type DxGridAxisMeta, type DxGridPosition } from '@dxos/react-ui-grid';

import { type InsertRowResult } from '../../model';

import { TableContent } from './TableContent';
import { TableToolbar } from './TableToolbar';

const columnDefault = { grid: { minSize: 80, maxSize: 640 } };
const rowDefault = { frozenRowsStart: { readonly: true, focusUnfurl: false } };
const emptyColumnMeta = Atom.make<DxGridAxisMeta>({ grid: {} });

//
// Context
//

type TableContextValue = {
  /** Mutable ref populated by Content so Root can expose the controller. */
  controllerRef: RefObject<TableController>;
};

const [TableContextProvider, useTableContext] = createContext<TableContextValue>('Table');

//
// Controller
//

type TableController = {
  update?: (cell?: DxGridPosition) => void;
  handleInsertRowResult?: (insertRowResult?: InsertRowResult) => void;
};

//
// Root
//

const TABLE_ROOT_NAME = 'Table.Root';

type TableRootProps = PropsWithChildren;

const TableRoot = forwardRef<TableController, TableRootProps>(({ children }, forwardedRef) => {
  const controllerRef = useRef<TableController>({});

  useImperativeHandle(
    forwardedRef,
    () => ({
      update: (cell) => controllerRef.current?.update?.(cell),
      handleInsertRowResult: (result) => controllerRef.current?.handleInsertRowResult?.(result),
    }),
    [],
  );

  return <TableContextProvider controllerRef={controllerRef}>{children}</TableContextProvider>;
});

TableRoot.displayName = TABLE_ROOT_NAME;

//
// Table
//

export const Table = {
  Root: TableRoot,
  Toolbar: TableToolbar,
  Content: TableContent,
};

export type { TableController, TableRootProps };

export { useTableContext };
