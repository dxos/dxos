//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, type PropsWithChildren, useEffect, useImperativeHandle, useMemo, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { testId } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { type ActionHandler } from '../../actions';
import { GraphModel, type Node } from '../../graph';
import {
  type DraggingState,
  type EditingState,
  EditorContext,
  type EditorContextType,
  type EditorOptions,
  SelectionModel,
} from '../../hooks';
import { type Shape } from '../../types';
import { Canvas } from '../Canvas';
import { UI } from '../UI';

// Scenario:
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): Activation bullets.

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
//  - Drop/snap visualization.
//  - Resize frames.
//  - Move all selected.
//  - Undo.

// Ontology:
// TODO(burdon): Separate shapes/layout from data graph.
//  - Graph is a view-like projection of underlying objects.
//  - Layout is a static or dynamic layout of shapes associated with graph nodes.
//  - Shapes are the visual representation of the layout.

// TODO(burdon): Debt:
//  - Factor out common Toolbar pattern (with state observers).

export const defaultEditorOptions: EditorOptions = {
  gridSize: 16,
  gridSnap: 32,
  zoomFactor: 2,
  zoomDuration: 300,
};

interface EditorController {
  zoomToFit(): void;
}

type EditorRootProps = ThemedClassName<
  PropsWithChildren<
    Partial<Pick<EditorContextType, 'options' | 'debug' | 'graph'>> & {
      id: string;
      selection?: SelectionModel;
      autoZoom?: boolean;
    }
  >
>;

const EditorRoot = forwardRef<EditorController, EditorRootProps>(
  (
    {
      children,
      classNames,
      id,
      options: _options = defaultEditorOptions,
      debug: _debug = false,
      graph: _graph,
      selection: _selection,
      autoZoom,
    },
    forwardedRef,
  ) => {
    // Canvas state.
    const options = useMemo(() => Object.assign({}, defaultEditorOptions, _options), [_options]);
    const [debug, setDebug] = useState(_debug);
    const [gridSize, setGridSize] = useState({ width: options.gridSize, height: options.gridSize });
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);

    // External state.
    const graph = useMemo<GraphModel<Node<Shape>>>(() => _graph ?? new GraphModel<Node<Shape>>(), [_graph]);
    const selection = useMemo(() => _selection ?? new SelectionModel(), [_selection]);

    // Editor state.
    const [dragging, setDragging] = useState<DraggingState>();
    const [linking, setLinking] = useState<DraggingState>();
    const [editing, setEditing] = useState<EditingState>();

    // Actions.
    const [actionHandler, setActionHandler] = useState<ActionHandler>();

    const context: EditorContextType = {
      id,
      options,
      graph,
      selection,

      actionHandler,
      setActionHandler: (handler) => setActionHandler(() => handler),

      debug,
      gridSize,
      showGrid,
      snapToGrid,
      setDebug,
      setGridSize,
      setShowGrid,
      setSnapToGrid,

      dragging,
      linking,
      editing,
      setDragging,
      setLinking,
      setEditing,
    };

    // Controller.
    useImperativeHandle(
      forwardedRef,
      () => {
        return {
          zoomToFit: () => {
            requestAnimationFrame(() => {
              void actionHandler?.({ type: 'zoom-to-fit', duration: 0 });
            });
          },
        };
      },
      [actionHandler],
    );

    // Trigger on graph change.
    useEffect(() => {
      if (graph.nodes.length && autoZoom) {
        setTimeout(() => {
          void actionHandler?.({ type: 'zoom-to-fit', duration: 0 });
        });
      }
    }, [actionHandler, graph, autoZoom]);

    return (
      <EditorContext.Provider value={context}>
        <div {...testId('dx-editor')} tabIndex={0} className={mx('relative w-full h-full overflow-hidden', classNames)}>
          {children}
        </div>
      </EditorContext.Provider>
    );
  },
);

export const Editor = {
  Root: EditorRoot,
  Canvas,
  UI,
};

export type { EditorRootProps, EditorController };
