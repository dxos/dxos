//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
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
  const { hasAttention } = useAttention(fullyQualifiedId(sheet));

  return graph ? (
    <SheetProvider sheet={sheet} graph={graph} ignoreAttention={ignoreAttention}>
      <StackItem.Content toolbar statusbar {...(role === 'section' && { classNames: 'aspect-video' })}>
        <SheetToolbar classNames={['pli-1 attention-surface', !hasAttention && 'opacity-20']} />
        <GridSheet />
        <FunctionEditor />
      </StackItem.Content>
    </SheetProvider>
  ) : null;
};
