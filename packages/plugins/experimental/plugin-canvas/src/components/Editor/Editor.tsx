//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { emptyGraph, type Graph, GraphModel } from '../../graph';
import { type DraggingState, type EditingState, EditorContext, SelectionModel, type TransformState } from '../../hooks';
import { Canvas } from '../Canvas';
import { UI } from '../UI';
import { testId } from '../util';

// Scenario:
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): Phase 1: Basic plugin.
//  - Group/collapse nodes; hierarchical editor.
//    - Bounding box/hierarchy. [DIFFERENTIATOR]
//  - Property panels (e.g. line style). Shape schema.
//    - Line options (1-to-many, inherits, etc.)
//  - Canvas ontology (e.g., what is Item vs Layout, etc.)
//  - Nodes as objects.
//  - Surface/form storybook; auto-size.
//  - Basic plugin with root object.
//  - Reactive wrapper for graph.

// TODO(burdon): Bugs.
//  - Offset when not fullscreen.

// TODO(burdon): Phase 2
//  - Auto-layout (reconcile with plugin-debug).
//    - AI generated layout from mermaid.
//    - UML of this package using Beast and mermaid.
//  - Spline.
//  - Drop/snap visualization.
//  - Undo.
//  - Resize frames.
//  - Context/CSS Variables.
//  - Move all selected.
//  - Factor out react-ui-xxx vs. plugin.

// TODO(burdon): Debt:
//  - Factor out common key shortcuts pattern.
//  - Factor out common Toolbar pattern (with state observers).

const defaultOffset = { x: 0, y: 0 };

type EditorRootProps = ThemedClassName<PropsWithChildren<Partial<TransformState & { graph: Graph }>>>;

const EditorRoot = ({
  children,
  classNames,
  scale: initialScale = 1,
  offset: initialOffset = defaultOffset,
  graph: initialGraph = emptyGraph,
}: EditorRootProps) => {
  // Canvas state.
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const [debug, setDebug] = useState(false);
  const [gridSize, setGridSize] = useState({ width: 32, height: 32 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [{ scale, offset }, setTransform] = useState<TransformState>({ scale: initialScale, offset: initialOffset });
  useEffect(() => {
    if (width && height && offset === defaultOffset) {
      setTransform({ scale, offset: { x: width / 2, y: height / 2 } });
    }
  }, [scale, offset, width, height]);

  // Data state.
  const graph = useMemo(() => new GraphModel(initialGraph), [initialGraph]);

  // Editor state.
  const selection = useMemo(() => new SelectionModel(), []);
  const [dragging, setDragging] = useState<DraggingState>();
  const [linking, setLinking] = useState<DraggingState>();
  const [editing, setEditing] = useState<EditingState>();

  return (
    <div {...testId('dx-editor')} ref={ref} className={mx('relative w-full h-full overflow-hidden', classNames)}>
      <EditorContext.Provider
        value={{
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
        }}
      >
        {children}
      </EditorContext.Provider>
    </div>
  );
};

export const Editor = {
  Root: EditorRoot,
  Canvas,
  UI,
};

export type { EditorRootProps };
