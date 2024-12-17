//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Editor } from './Editor';
import { type CanvasType } from '../types';

export const CanvasContainer = ({ canvas }: { canvas: CanvasType }) => {
  const id = fullyQualifiedId(canvas);
  return (
    <StackItem.Content id={id} toolbar={false}>
      <Editor.Root id={id}>
        <Editor.Canvas />
        <Editor.UI />
      </Editor.Root>
    </StackItem.Content>
  );
};

export default CanvasContainer;
