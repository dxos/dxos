//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { AttentionContainer } from './AttentionContainer';
import { ShapeRegistry } from './Canvas';
import { Editor } from './Editor';
import { computeShapes } from '../compute';
import { createMachine, createTest3 } from '../compute/testing';
import { useGraphMonitor } from '../hooks';
import { type CanvasBoardType } from '../types';

export const CanvasContainer = ({ canvas }: { canvas: CanvasBoardType }) => {
  const id = fullyQualifiedId(canvas);
  // TODO(burdon): Use canvas.graph.
  const graph = useMemo(() => createTest3(), []);
  const { machine } = useMemo(() => createMachine(graph), []);
  const graphMonitor = useGraphMonitor(machine);
  const registry = useMemo(() => new ShapeRegistry(computeShapes), []);

  // TODO(burdon): When in solo both components are still mounted. Should transplant.
  useEffect(() => {
    console.log('construct CanvasContainer');
    return () => {
      console.log('destruct CanvasContainer');
    };
  }, []);

  // TODO(burdon): Allow configuration of UI/Toolbar.
  return (
    <StackItem.Content id={id} toolbar={false}>
      <AttentionContainer id={id}>
        <Editor.Root id={id} graph={graph} graphMonitor={graphMonitor} registry={registry}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>
    </StackItem.Content>
  );
};

export default CanvasContainer;
