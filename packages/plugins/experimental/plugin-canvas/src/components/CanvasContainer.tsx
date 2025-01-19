//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type GraphEdge, GraphModel, type GraphNode } from '@dxos/graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { ShapeRegistry } from './Canvas';
import { Editor, type EditorController } from './Editor';
import { KeyboardContainer } from './KeyboardContainer';
import { type ComputeShape, computeShapes, useGraphMonitor } from '../compute';
import { createMachine } from '../compute/testing';
import { type CanvasBoardType, type Connection } from '../types';

export const CanvasContainer = ({ canvas, role }: { canvas: CanvasBoardType; role: string }) => {
  const id = fullyQualifiedId(canvas);

  // TODO(burdon): Use canvas.graph.
  // const space = getSpace(canvas);
  const graph = useMemo(() => new GraphModel<GraphNode<ComputeShape>, GraphEdge<Connection>>(canvas.layout), []);
  const { machine } = useMemo(() => createMachine(graph), []);
  const editorRef = useRef<EditorController>(null);
  useEffect(() => {
    if (!machine) {
      return;
    }

    // TODO(burdon): Better abstraction for context?
    // machine.setContext({
    //   space,
    //   model: '@anthropic/claude-3-5-sonnet-20241022',
    //   gpt: new EdgeGptExecutor(
    //     new AIServiceClientImpl({
    //       endpoint: 'https://ai-service.dxos.workers.dev',
    //     }),
    //   ),
    // });
    void machine.open();

    return () => {
      void machine.close();
    };
  }, [machine]);

  const graphMonitor = useGraphMonitor(machine.graph);
  const registry = useMemo(() => new ShapeRegistry(computeShapes), []);

  // TODO(burdon): Allow configuration of UI/Toolbar.
  return (
    <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'}>
      <KeyboardContainer id={id}>
        <Editor.Root id={id} ref={editorRef} graph={graph} graphMonitor={graphMonitor} registry={registry}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </KeyboardContainer>
    </StackItem.Content>
  );
};

export default CanvasContainer;
