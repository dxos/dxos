//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { AIServiceClientImpl } from '@dxos/assistant';
import { type Config } from '@dxos/client';
import { ComputeGraphModel, EdgeGpt } from '@dxos/conductor';
import { createStubEdgeIdentity, EdgeClient, EdgeHttpClient } from '@dxos/edge-client';
import { useConfig } from '@dxos/react-client';
import { fullyQualifiedId, getSpace, type Space } from '@dxos/react-client/echo';
import {
  ComputeContext,
  ComputeGraphController,
  type ComputeShape,
  ComputeShapeLayout,
  computeShapes,
  type Services,
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

const createServices = (config: Config, space?: Space): Partial<Services> => {
  return {
    spaceService:
      space == null
        ? undefined
        : {
            spaceId: space.id,
            db: space.db,
          },
    gpt:
      config.values.runtime?.services?.ai?.server == null
        ? undefined
        : new EdgeGpt(new AIServiceClientImpl({ endpoint: config.values.runtime?.services?.ai?.server })),
    edgeClient:
      config.values.runtime?.services?.edge?.url == null
        ? undefined
        : new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: config.values.runtime?.services?.edge?.url }),
    edgeHttpClient:
      config.values.runtime?.services?.edge?.url == null
        ? undefined
        : new EdgeHttpClient(config.values.runtime?.services?.edge?.url),
  };
};

const useGraphController = (canvas: CanvasBoardType) => {
  const config = useConfig();
  const space = getSpace(canvas);
  const controller = useMemo(() => {
    if (!canvas.computeGraph?.target) {
      return null;
    }
    const model = new ComputeGraphModel(canvas.computeGraph?.target);
    const controller = new ComputeGraphController(model);
    controller.setServices(createServices(config, space));
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
  const id = fullyQualifiedId(canvas);
  const graph = useMemo(() => CanvasGraphModel.create<ComputeShape>(canvas.layout), [canvas.layout]);
  const controller = useGraphController(canvas);
  const graphMonitor = useGraphMonitor(controller?.graph);
  const registry = useMemo(() => new ShapeRegistry(computeShapes), []);
  const editorRef = useRef<EditorController>(null);

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
      <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'}>
        <KeyboardContainer id={id}>
          <Editor.Root
            id={id}
            ref={editorRef}
            registry={registry}
            graph={graph}
            graphMonitor={graphMonitor as any}
            layout={layout}
          >
            <Editor.Canvas />
            <Editor.UI />
          </Editor.Root>
        </KeyboardContainer>
      </StackItem.Content>
    </ComputeContext.Provider>
  );
};

export default CanvasContainer;
