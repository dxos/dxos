//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import {
  ComputeContext,
  computeShapes,
  createComputeGraphController,
  useGraphMonitor,
  type ComputeShape,
} from '@dxos/react-ui-canvas-compute';
import {
  type CanvasBoardType,
  CanvasGraphModel,
  Editor,
  type EditorController,
  KeyboardContainer,
  ShapeRegistry,
} from '@dxos/react-ui-canvas-editor';
import { StackItem } from '@dxos/react-ui-stack';

const useGraphController = (graph: CanvasGraphModel<ComputeShape>) => {
  const { controller } = useMemo(() => createComputeGraphController(graph), [graph]);
  useEffect(() => {
    void controller.open();
    return () => {
      void controller.close();
    };
  }, [controller]);
  return controller;
};

export const CanvasContainer = ({ canvas, role }: { canvas: CanvasBoardType; role: string }) => {
  const id = fullyQualifiedId(canvas);
  const graph = useMemo(() => CanvasGraphModel.create<ComputeShape>(canvas.layout), []);
  const controller = useGraphController(graph);
  const graphMonitor = useGraphMonitor(controller.graph);
  const registry = useMemo(() => new ShapeRegistry(computeShapes), []);
  const editorRef = useRef<EditorController>(null);

  return (
    <ComputeContext.Provider value={{ controller }}>
      <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'}>
        <KeyboardContainer id={id}>
          <Editor.Root id={id} ref={editorRef} registry={registry} graph={graph} graphMonitor={graphMonitor as any}>
            <Editor.Canvas />
            <Editor.UI />
          </Editor.Root>
        </KeyboardContainer>
      </StackItem.Content>
    </ComputeContext.Provider>
  );
};

export default CanvasContainer;
