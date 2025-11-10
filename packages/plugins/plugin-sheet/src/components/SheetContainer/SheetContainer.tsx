//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { type Sheet } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider } from '../SheetContext';
import { SheetToolbar } from '../SheetToolbar';

export type SheetContainerProps = {
  space: Space;
  sheet: Sheet.Sheet;
  role?: string;
  ignoreAttention?: boolean;
};

export const SheetContainer = ({ space, sheet, role, ignoreAttention }: SheetContainerProps) => {
  const graph = useComputeGraph(space);

  return graph ? (
    <SheetProvider sheet={sheet} graph={graph} ignoreAttention={ignoreAttention}>
      <StackItem.Content
        toolbar
        statusbar
        classNames={[role === 'section' && 'aspect-video', role === 'story' && 'bs-full']}
      >
        <SheetToolbar id={Obj.getDXN(sheet).toString()} />
        <GridSheet />
        <FunctionEditor />
      </StackItem.Content>
    </SheetProvider>
  ) : null;
};
