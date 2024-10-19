//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider, type SheetProviderProps } from '../SheetContext';
import { Toolbar } from '../Toolbar';

export const SheetContainer = ({ graph, sheet, role }: SheetProviderProps & { role?: string }) => {
  return (
    <SheetProvider sheet={sheet} graph={graph}>
      <Toolbar.Root role={role}>
        <Toolbar.Styles />
        <Toolbar.Alignment />
        <Toolbar.Separator />
        <Toolbar.Actions />
      </Toolbar.Root>
      <div role='none' className='border-bs border-separator grid cols-1 rows-[1fr_min-content] min-bs-0'>
        <GridSheet />
        <FunctionEditor />
      </div>
    </SheetProvider>
  );
};
