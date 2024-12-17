//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Editor } from './Editor';
import { type CanvasType } from '../types';

export const CanvasContainer = ({ canvas }: { canvas: CanvasType }) => {
  return (
    <StackItem.Content id={fullyQualifiedId(canvas)} toolbar={false}>
      <Editor.Root>
        <Editor.Canvas />
        <Editor.UI />
      </Editor.Root>
    </StackItem.Content>
  );
};

export default CanvasContainer;
