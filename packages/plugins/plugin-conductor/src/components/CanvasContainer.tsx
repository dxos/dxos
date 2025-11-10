//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type Config } from '@dxos/client';
import { ComputeGraphModel } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { DatabaseService, QueueService } from '@dxos/functions';
import { ServiceContainer } from '@dxos/functions-runtime';
import { useConfig } from '@dxos/react-client';
import { type Space, getSpace } from '@dxos/react-client/echo';
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

const createServices = (config: Config, space?: Space): ServiceContainer => {
  return new ServiceContainer().setServices({
    database: space == null ? undefined : DatabaseService.make(space.db),
    queues: space == null ? undefined : QueueService.make(space.queues, undefined),
  });
};

const useGraphController = (canvas: CanvasBoardType) => {
  const config = useConfig();
  const space = getSpace(canvas);
  const controller = useMemo(() => {
    if (!canvas.computeGraph?.target) {
      return null;
    }
    const model = new ComputeGraphModel(canvas.computeGraph?.target);
    const controller = new ComputeGraphController(createServices(config, space), model);
    return controller;
  }, [canvas.computeGraph?.target, space]);

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
