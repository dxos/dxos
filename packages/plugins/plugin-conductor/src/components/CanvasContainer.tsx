//
// Copyright 2024 DXOS.org
//

import React, { Fragment, useEffect, useMemo, useRef } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { ComputeGraphModel } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { useObject } from '@dxos/react-client/echo';
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
  type CanvasBoard,
  CanvasGraphModel,
  Editor,
  type EditorController,
  KeyboardContainer,
  ShapeRegistry,
} from '@dxos/react-ui-canvas-editor';
import { Layout, type LayoutFlexProps } from '@dxos/react-ui-mosaic';

export type CanvasContainerProps = SurfaceComponentProps<CanvasBoard.CanvasBoard>;

export const CanvasContainer = ({ role, subject: canvas }: CanvasContainerProps) => {
  const id = Obj.getDXN(canvas as any).toString();
  useObject(canvas);
  const graph = useMemo(
    () => CanvasGraphModel.create<ComputeShape>(canvas.layout, (fn) => Obj.change(canvas, fn)),
    [canvas],
  );
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

  const Root = role === 'section' ? Container : Fragment;

  return (
    <ComputeContext.Provider value={{ controller }}>
      <Root>
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
      </Root>
    </ComputeContext.Provider>
  );
};

const Container = (props: LayoutFlexProps) => <Layout.Flex {...props} classNames='aspect-square' />;

const useGraphController = (canvas: CanvasBoard.CanvasBoard) => {
  const db = Obj.getDatabase(canvas);
  const runtime = useCapability(AutomationCapabilities.ComputeRuntime);
  const [computeGraph] = useObject(canvas.computeGraph);
  const controller = useMemo(() => {
    if (!canvas.computeGraph?.target || !db) {
      return null;
    }
    const model = new ComputeGraphModel(canvas.computeGraph?.target);
    const controller = new ComputeGraphController(runtime.getRuntime(db.spaceId), model);
    return controller;
  }, [computeGraph, db]);

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

export default CanvasContainer;
