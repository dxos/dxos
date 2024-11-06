//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';

import { type SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider } from '../SheetContext';
import { Toolbar } from '../Toolbar';

export const SheetContainer = ({ space, sheet, role }: { space: Space; sheet: SheetType; role?: string }) => {
  const graph = useComputeGraph(space);

  return graph ? (
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
  ) : null;
};
