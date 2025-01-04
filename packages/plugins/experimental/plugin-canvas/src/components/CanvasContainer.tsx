//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { AttentionContainer } from './AttentionContainer';
import { ShapeRegistry } from './Canvas';
import { Editor, type EditorController } from './Editor';
import { computeShapes } from '../compute';
import { createMachine, createTest3 } from '../compute/testing';
import { useGraphMonitor } from '../hooks';
import { type CanvasBoardType } from '../types';

export const CanvasContainer = ({ canvas }: { canvas: CanvasBoardType }) => {
  const id = fullyQualifiedId(canvas);
  // TODO(burdon): Use canvas.graph.
  const space = getSpace(canvas);
  const graph = useMemo(() => createTest3(true), []);
  const { machine } = useMemo(() => createMachine(graph), []);
  const editorRef = useRef<EditorController>(null);
  useEffect(() => {
    if (!machine) {
      return;
    }

    // TODO(burdon): Better abstraction for context?
    machine.setContext({ space, model: '@anthropic/claude-3-5-sonnet-20241022' });
    void machine.open();
    const off = machine.update.on((ev) => {
      const { node } = ev;
      void editorRef.current?.action?.({ type: 'trigger', ids: [node.id] });
    });

    return () => {
      void machine.close();
      off();
    };
  }, [machine]);
  const graphMonitor = useGraphMonitor(machine);
  const registry = useMemo(() => new ShapeRegistry(computeShapes), []);

  // TODO(burdon): Allow configuration of UI/Toolbar.
  return (
    <StackItem.Content id={id} toolbar={false}>
      <AttentionContainer id={id}>
        <Editor.Root id={id} ref={editorRef} graph={graph} graphMonitor={graphMonitor} registry={registry}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>
    </StackItem.Content>
  );
};

export default CanvasContainer;
