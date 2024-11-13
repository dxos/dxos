//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { StackItemContent } from '@dxos/react-ui-stack/next';

import { type SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider } from '../SheetContext';
import { Toolbar } from '../Toolbar';

export const SheetContainer = ({ space, sheet, role }: { space: Space; sheet: SheetType; role?: string }) => {
  const graph = useComputeGraph(space);

  return graph ? (
    <StackItemContent toolbar statusbar>
      <SheetProvider sheet={sheet} graph={graph}>
        <Toolbar.Root role={role}>
          <Toolbar.Styles />
          <Toolbar.Alignment />
          <Toolbar.Separator />
          <Toolbar.Actions />
        </Toolbar.Root>
        <GridSheet />
        <FunctionEditor />
      </SheetProvider>
    </StackItemContent>
  ) : (
    <span role='none' className='attention-surface' />
  );
};
