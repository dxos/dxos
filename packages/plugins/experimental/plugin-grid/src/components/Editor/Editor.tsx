//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren, useCallback, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type ActionHandler } from '../../actions';
import { Canvas, type Item } from '../Canvas';
import { UI } from '../UI';
import { testId } from '../util';

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
  showGrid: boolean;
  snapToGrid: boolean;
  dragging?: DraggingState;
  linking?: DraggingState;
  editing?: EditingState;
  setDragging: (state: DraggingState | undefined) => void;
  setLinking: (state: DraggingState | undefined) => void;
  setEditing: (state: EditingState | undefined) => void;
  handleAction: ActionHandler;
};

/**
 * @internal
 */
// TODO(burdon): Use Radix.
export const EditorContext = createContext<EditorContextType | undefined>(undefined);

// Scenario:
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): Phase 1: Basic plugin.
//  - Property panels (e.g. line style). Form.
//  - Bounding box/hierarchy. [DIFFERENTIATOR]
//  - Canvas ontology (e.g., what is Item vs Layout, etc.)
//  - Nodes as objects.
//  - Surface/form storybook; auto-size.
//  - Basic plugin with root object.
//  - Context/CSS Variables.

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
//  - Selection model.
//  - Order of rendering layers.
//  - Move all selected.
//  - Initial dragging offset.
//  - Factor out react-ui-xxx vs. plugin.
//  - Factor out common Toolbar pattern (with state observers).

type EditorRootProps = ThemedClassName<PropsWithChildren>;

const EditorRoot = ({ children, classNames }: EditorRootProps) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const [debug, setDebug] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
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
          width,
          height,
          showGrid,
          snapToGrid,
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
