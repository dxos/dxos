//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { type SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider } from '../SheetContext';
import { Toolbar } from '../Toolbar';

export const SheetContainer = ({
  space,
  sheet,
  role,
  ignoreAttention,
}: {
  space: Space;
  sheet: SheetType;
  role?: string;
  ignoreAttention?: boolean;
}) => {
  const graph = useComputeGraph(space);

  return graph ? (
    <SheetProvider sheet={sheet} graph={graph} ignoreAttention={ignoreAttention}>
      <StackItem.Content toolbar statusbar {...(role === 'section' && { classNames: 'aspect-video' })}>
        <Toolbar.Root role={role}>
          <Toolbar.Styles />
          <Toolbar.Alignment />
          <Toolbar.Separator />
          <Toolbar.Actions />
        </Toolbar.Root>
        <GridSheet />
        <FunctionEditor />
      </StackItem.Content>
    </SheetProvider>
  ) : null;
};
