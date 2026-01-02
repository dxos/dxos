//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { ComputeGraphModel } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import {
  ComputeContext,
  ComputeGraphController,
  type ComputeShape,
  ComputeShapeLayout,
  computeShapes,
  useComputeGraphController,
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
  const db = Obj.getDatabase(canvas);
  const runtime = useCapability(AutomationCapabilities.ComputeRuntime);
  const controller = useMemo(() => {
    if (!canvas.computeGraph?.target || !db) {
      return null;
    }
    const model = new ComputeGraphModel(canvas.computeGraph?.target);
    const controller = new ComputeGraphController(runtime.getRuntime(db.spaceId), model);
    return controller;
  }, [canvas.computeGraph?.target, db]);

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
  const id = Obj.getDXN(canvas as any).toString();
  const graph = useMemo(() => CanvasGraphModel.create<ComputeShape>(canvas.layout), [canvas.layout]);
  const controller = useGraphController(canvas);
  const graphMonitor = useGraphMonitor(controller?.graph);
  const registry = useMemo(() => new ShapeRegistry(computeShapes), []);
  const editorRef = useRef<EditorController>(null);
  useComputeGraphController({ controller, graph, editorRef });

  // Layout.
  const layout = useMemo(
    () => (controller && registry ? new ComputeShapeLayout(controller, registry) : undefined),
    [controller, registry],
  );

  if (!controller) {
    return;
  }

  return (
    <ComputeContext.Provider value={{ controller }}>
      <StackItem.Content size={role === 'section' ? 'square' : 'intrinsic'}>
        <KeyboardContainer id={id}>
          <Editor.Root
            id={id}
            ref={editorRef}
            graph={graph}
            graphMonitor={graphMonitor as any}
            registry={registry}
            layout={layout}
          >
            <Editor.Canvas />
            <Editor.UI showTools />
          </Editor.Root>
        </KeyboardContainer>
      </StackItem.Content>
    </ComputeContext.Provider>
  );
};

export default CanvasContainer;
