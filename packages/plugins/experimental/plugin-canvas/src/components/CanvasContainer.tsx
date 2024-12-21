//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { AttentionContainer } from './AttentionContainer';
import { Editor } from './Editor';
import { type CanvasBoardType } from '../types';

export const CanvasContainer = ({ canvas }: { canvas: CanvasBoardType }) => {
  const id = fullyQualifiedId(canvas);
  return (
    <StackItem.Content id={id} toolbar={false}>
      <AttentionContainer id={id}>
        <Editor.Root id={id}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>
    </StackItem.Content>
  );
};

export default CanvasContainer;
