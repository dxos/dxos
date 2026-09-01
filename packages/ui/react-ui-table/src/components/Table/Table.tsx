//
// Copyright 2024 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type PropsWithChildren, forwardRef, useImperativeHandle, useRef } from 'react';

import { type DxGridAxisMeta, type DxGridPosition } from '@dxos/react-ui-grid';

import { type InsertRowResult } from '../../model/index.ts';
import { TableContent } from './TableContent.tsx';
import { TableContextProvider } from './TableContext.ts';
import { TableToolbar } from './TableToolbar.tsx';

const columnDefault = { grid: { minSize: 80, maxSize: 640 } };
const rowDefault = { frozenRowsStart: { readonly: true, focusUnfurl: false } };
const emptyColumnMeta = Atom.make<DxGridAxisMeta>({ grid: {} });

//
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
export type { TableExportFormat } from './TableToolbar.tsx';
