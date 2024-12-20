//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, type PropsWithChildren, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

import { emptyGraph, type Graph, GraphModel, type Node } from '../../graph';
import {
  type DraggingState,
  type EditingState,
  EditorContext,
  type EditorContextType,
  type EditorOptions,
  SelectionModel,
  type TransformState,
  handleAction,
} from '../../hooks';
import { type Shape } from '../../types';
import { Canvas } from '../Canvas';
import { UI } from '../UI';
import { testId } from '../util';

// Scenario:
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): NEXT
//  - Different shapes (reconcile rect, circle, line).
//  - Dragging: shape, anchor, tool.\

// TODO(burdon): Phase 1: Basic plugin.
//  - Group/collapse nodes; hierarchical editor.
//    - Bounding box/hierarchy. [DIFFERENTIATOR]
//  - Property panels (e.g. line style). Shape schema.
//    - Line options (1-to-many, inherits, etc.)
//  - Surface/form storybook; auto-size.
//  - Reactive wrapper for graph.

// TODO(burdon): Phase 2
//  - Auto-layout (reconcile with plugin-debug).
//    - AI generated layout from mermaid.
//    - UML of this package using Beast and mermaid.
//  - Spline.
//  - Drop/snap visualization.
//  - Resize frames.
//  - Move all selected.
//  - Factor out react-ui-xxx vs. plugin.
//  - Undo.

// Ontology:
// TODO(burdon): Separate shapes/layout from data graph.
//  - Graph is a view-like projection of underlying objects.
//  - Layout is a static or dynamic layout of shapes associated with graph nodes.
//  - Shapes are the visual representation of the layout.

// TODO(burdon): Debt:
//  - Factor out common Toolbar pattern (with state observers).

const defaultOffset = { x: 0, y: 0 };

export const defaultEditorOptions: EditorOptions = {
  gridSize: 16,
  zoomFactor: 2,
};

interface EditorController {
  zoomToFit(): Promise<void>;
}

type EditorRootProps = ThemedClassName<
  PropsWithChildren<
    Partial<
      Pick<EditorContextType, 'options' | 'debug' | 'scale' | 'offset'> & {
        // TODO:(burdon): Has for attention (move to storybook).
        attention?: boolean;
        graph: Graph;
      }
    > & {
      id: string;
    }
  >
>;

const EditorRoot = forwardRef<EditorController, EditorRootProps>(
  (
    {
      children,
      classNames,
      id,
      attention,
      options: _options = defaultEditorOptions,
      debug: _debug = false,
      scale: _scale = 1,
      offset: _offset = defaultOffset,
      graph: _graph = emptyGraph,
    },
    forwardedRef,
  ) => {
    // Canvas state.
    const { ref, width = 0, height = 0 } = useResizeDetector();
    const attendableAttrs = useAttendableAttributes(id);
    const options = useMemo(() => Object.assign({}, defaultEditorOptions, _options), [_options]);
    const [debug, setDebug] = useState(_debug);
    const [gridSize, setGridSize] = useState({ width: 32, height: 32 });
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [{ scale, offset }, setTransform] = useState<TransformState>({ scale: _scale, offset: _offset });
    useEffect(() => {
      if (width && height && offset === defaultOffset) {
        setTransform({ scale, offset: { x: width / 2, y: height / 2 } });
      }
    }, [scale, offset, width, height]);

    // Data state.
    const graph = useMemo<GraphModel<Node<Shape>>>(() => new GraphModel<Node<Shape>>(_graph), [_graph]);

    // Editor state.
    const selection = useMemo(() => new SelectionModel(), []);
    const [dragging, setDragging] = useState<DraggingState>();
    const [linking, setLinking] = useState<DraggingState>();
    const [editing, setEditing] = useState<EditingState>();

    const context: EditorContextType = {
      id,
      options,
      debug,
      setDebug,

      width,
      height,

      scale,
      offset,
      setTransform,

      gridSize,
      setGridSize,

      showGrid,
      setShowGrid,

      snapToGrid,
      setSnapToGrid,

      graph,
      selection,

      dragging,
      setDragging,

      linking,
      setLinking,

      editing,
      setEditing,
    };

    // Controller.
    useImperativeHandle(
      forwardedRef,
      () => ({
        zoomToFit: async () => {
          setTimeout(async () => {
            const handler = handleAction(context);
            await handler({ type: 'zoom-to-fit', duration: 0 });
          });
        },
      }),
      [context],
    );

    return (
      <div
        {...testId('dx-editor')}
        {...attendableAttrs}
        ref={ref}
        className={mx('relative w-full h-full overflow-hidden', classNames)}
      >
        <EditorContext.Provider value={context}>
          <HotkeysProvider initiallyActiveScopes={attention ? ['*'] : ['app']}>{children}</HotkeysProvider>
        </EditorContext.Provider>
      </div>
    );
  },
);

export const Editor = {
  Root: EditorRoot,
  Canvas,
  UI,
};

export type { EditorRootProps, EditorController };
