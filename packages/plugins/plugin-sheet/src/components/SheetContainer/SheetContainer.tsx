//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { type SheetType } from '../../types';
import { useComputeGraph } from '../ComputeGraph';
import { FunctionEditor } from '../FunctionEditor';
import { GridSheet } from '../GridSheet';
import { SheetProvider } from '../SheetContext';
import { SheetToolbar } from '../SheetToolbar';

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
        <SheetToolbar attendableId={fullyQualifiedId(sheet)} />
        <GridSheet />
        <FunctionEditor />
      </StackItem.Content>
    </SheetProvider>
  ) : null;
};
