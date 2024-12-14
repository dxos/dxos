//
// Copyright 2024 DXOS.org
//

import React, {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type ActionHandler } from '../../actions';
import { SelectionModel } from '../../hooks';
import { type Dimension, type Point } from '../../layout';
import { Canvas, type Item } from '../Canvas';
import { UI } from '../UI';
import { testId } from '../util';

// Scenario:
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

//  - TODO(burdon): Factor out selection.
//  - TODO(burdon): Factor out selection bounds.
//  - TODO(burdon): Factor out action handling.
//  - TODO(burdon): Factor out key handling (move to UI).

// TODO(burdon): Phase 1: Basic plugin.
//  - Property panels (e.g. line style). Form.
//  - Bounding box/hierarchy. [DIFFERENTIATOR]
//  - Canvas ontology (e.g., what is Item vs Layout, etc.)
//  - Nodes as objects.
//  - Surface/form storybook; auto-size.
//  - Basic plugin with root object.
//  - Hover select.

// TODO(burdon): Phase 2
//  - Auto-layout (reconcile with plugin-debug).
//    - UML of this package using Beast and mermaid.
//  - Spline.
//  - Drop/snap visualization.
//  - Undo.
//  - Resize frames.
//  - Group/collapse nodes; hierarchical editor.
//  - Line options (1-to-many, inherits, etc.)

// TODO(burdon): Misc.
//  - Context/CSS Variables.
//  - Selection model.
//  - Order of rendering layers.
//  - Move all selected.
//  - Initial dragging offset.
//  - Factor out react-ui-xxx vs. plugin.
//  - Factor out common Toolbar pattern (with state observers).

export type TransformState = {
  scale: number;
  offset: Point;
};

export type DraggingState = {
  container: HTMLElement;
  item: Item;
  anchor?: string;
};

export type EditingState = {
  item: Item;
};

export type EditorContextType = {
  debug: boolean;

  width: number;
  height: number;
  scale: number;
  offset: Point;

  gridSize: Dimension;
  showGrid: boolean;
  snapToGrid: boolean;
  selection: SelectionModel;
  dragging?: DraggingState;
  linking?: DraggingState;
  editing?: EditingState;

  setGridSize: Dispatch<SetStateAction<Dimension>>;
  setTransform: Dispatch<SetStateAction<TransformState>>;
  setDragging: Dispatch<SetStateAction<DraggingState | undefined>>;
  setLinking: Dispatch<SetStateAction<DraggingState | undefined>>;
  setEditing: Dispatch<SetStateAction<EditingState | undefined>>;
  handleAction: ActionHandler;
};

/**
 * @internal
 */
// TODO(burdon): Use Radix.
export const EditorContext = createContext<EditorContextType | undefined>(undefined);

type EditorRootProps = ThemedClassName<PropsWithChildren<Partial<TransformState>>>;

const EditorRoot = ({ children, classNames, scale: initialScale = 1, offset: initialOffset }: EditorRootProps) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const [debug, setDebug] = useState(false);

  // Canvas state.
  const [gridSize, setGridSize] = useState({ width: 32, height: 32 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [{ scale, offset }, setTransform] = useState<TransformState>({
    scale: initialScale,
    offset: (initialOffset = { x: 0, y: 0 }),
  });

  // Editor state.
  const selection = useMemo(() => new SelectionModel(), []);
  const [dragging, setDragging] = useState<DraggingState>();
  const [linking, setLinking] = useState<DraggingState>();
  const [editing, setEditing] = useState<EditingState>();

  const handleAction = useCallback<ActionHandler>(
    (action) => {
      const { type } = action;
      switch (type) {
        case 'debug': {
          setDebug(!debug);
          return true;
        }
        case 'grid': {
          setShowGrid(action?.on ?? !showGrid);
          return true;
        }
        case 'snap': {
          setSnapToGrid(action?.on ?? !snapToGrid);
          return true;
        }
      }

      return false;
    },
    [debug, showGrid, snapToGrid],
  );

  return (
    <div
      {...testId('dx-editor')}
      className={mx('relative inset-0 w-full h-full overflow-hidden', classNames)}
      ref={ref}
    >
      <EditorContext.Provider
        value={{
          debug,

          // Canvas state.
          width,
          height,
          scale,
          offset,
          setTransform,
          gridSize,
          setGridSize,
          showGrid,
          snapToGrid,

          // Editor state.
          selection,
          dragging,
          setDragging,
          linking,
          setLinking,
          editing,
          setEditing,
          handleAction,
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
