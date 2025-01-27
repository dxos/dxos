//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { ShapeRegistry } from './Canvas';
import { Editor, type EditorController } from './Editor';
import { KeyboardContainer } from './KeyboardContainer';
import { type ComputeShape, computeShapes, createComputeGraphController, useGraphMonitor } from '../compute';
import { type CanvasBoardType } from '../types';
import { CanvasGraphModel } from '../types';

export const CanvasContainer = ({ canvas, role }: { canvas: CanvasBoardType; role: string }) => {
  const id = fullyQualifiedId(canvas);
  const graph = useMemo(() => CanvasGraphModel.create<ComputeShape>(canvas.layout), []);
  const { controller } = useMemo(() => createComputeGraphController(graph), []);
  const editorRef = useRef<EditorController>(null);
  useEffect(() => {
    if (!controller) {
      return;
    }

    void controller.open();
    return () => {
      void controller.close();
    };
  }, [controller]);

  const graphMonitor = useGraphMonitor(controller.graph);
  const registry = useMemo(() => new ShapeRegistry(computeShapes), []);

  // TODO(burdon): Allow configuration of UI/Toolbar.
  return (
    <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'}>
      <KeyboardContainer id={id}>
        <Editor.Root id={id} ref={editorRef} registry={registry} graph={graph} graphMonitor={graphMonitor as any}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </KeyboardContainer>
    </StackItem.Content>
  );
};

export default CanvasContainer;
