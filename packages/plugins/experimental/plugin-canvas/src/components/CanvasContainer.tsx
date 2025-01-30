//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { ComputeGraphModel } from '@dxos/conductor';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import {
  ComputeContext,
  ComputeGraphController,
  type ComputeShape,
  computeShapes,
  useGraphMonitor,
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

const useGraphController = (canvas: CanvasBoardType) => {
  const controller = useMemo(() => {
    if (!canvas.computeGraph?.target) {
      return null;
    }
    const model = new ComputeGraphModel(canvas.computeGraph?.target);
    return new ComputeGraphController(model);
  }, [canvas.computeGraph?.target]);

  useEffect(() => {
    if (!controller) {
      return;
    }
    void controller.open();
    return () => {
      void controller.close();
    };
  }, [controller]);

  return controller;
};

export const CanvasContainer = ({ canvas, role }: { canvas: CanvasBoardType; role: string }) => {
  const id = fullyQualifiedId(canvas);
  const graph = useMemo(() => CanvasGraphModel.create<ComputeShape>(canvas.layout), [canvas.layout]);
  const controller = useGraphController(canvas);
  const graphMonitor = useGraphMonitor(controller?.graph);
  const registry = useMemo(() => new ShapeRegistry(computeShapes), []);
  const editorRef = useRef<EditorController>(null);

  if (!controller) {
    return;
  }

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
