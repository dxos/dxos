//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren, useCallback, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { Editor } from './Editor';
import { type Item } from './Shape';
import { type ActionHandler } from '../../actions';

export type DraggingState = {
  container: HTMLElement;
  item: Item;
  anchor?: string;
};

export type EditingState = {
  item: Item;
};

export type CanvasContext = {
  debug: boolean;
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

// Scenario:
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): Phase 1: Basic plugin.
//  - Bounding box/hierarchy. [DIFFERENTIATOR]
//  - Canvas ontology (e.g., what is Item vs Layout, etc.)
//  - Nodes as objects.
//  - Surface/form storybook; auto-size.
//  - Basic plugin with root object.

// TODO(burdon): Phase 2
//  - Property panels (e.g. line style).
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

/**
 * @internal
 */
// TODO(burdon): Use Radix.
export const CanvasContext = createContext<CanvasContext | undefined>(undefined);

type CanvasRootProps = ThemedClassName<PropsWithChildren>;

const CanvasRoot = ({ children, classNames }: CanvasRootProps) => {
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
    <CanvasContext.Provider
      value={{
        debug,
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
    </CanvasContext.Provider>
  );
};

export const Canvas = {
  Root: CanvasRoot,
  Editor,
};

export type { CanvasRootProps };
