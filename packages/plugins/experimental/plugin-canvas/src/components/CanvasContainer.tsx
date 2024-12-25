//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { GraphModel, type GraphNode } from '@dxos/graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { AttentionContainer } from './AttentionContainer';
import { Editor } from './Editor';
import { type CanvasBoardType, type Shape } from '../types';

export const CanvasContainer = ({ canvas }: { canvas: CanvasBoardType }) => {
  const id = fullyQualifiedId(canvas);
  const graph = useMemo(() => new GraphModel<GraphNode<Shape>>(canvas.graph), [canvas.graph]);

  return (
    <StackItem.Content id={id} toolbar={false}>
      <AttentionContainer id={id}>
        <Editor.Root id={id} graph={graph}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>
    </StackItem.Content>
  );
};

export default CanvasContainer;
