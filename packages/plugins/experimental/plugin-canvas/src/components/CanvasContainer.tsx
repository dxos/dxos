//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Editor } from './Editor';
import { KeyboardContainer } from './KeyboardContainer';
import { type CanvasBoardType } from '../types';

export const CanvasContainer = ({ canvas, role }: { canvas: CanvasBoardType; role: string }) => {
  const id = fullyQualifiedId(canvas);
  return (
    <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'}>
      <KeyboardContainer id={id}>
        <Editor.Root id={id}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </KeyboardContainer>
    </StackItem.Content>
  );
};

export default CanvasContainer;
