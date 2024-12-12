//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren, useCallback, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { Editor } from './Editor';
import { type Item } from './Shape';
import { type ActionHandler } from './actions';

export type DraggingState = {
  item: Item;
  container: HTMLElement;
};

export type EditingState = {
  item: Item;
};

export type CanvasContext = {
  debug: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  dragging?: DraggingState;
  editing?: EditingState;
  setDragging: (state: DraggingState | undefined) => void;
  setEditing: (state: EditingState | undefined) => void;
  handleAction: ActionHandler;
};

// TODO(burdon): Focus
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): Phase 1: Basic plugin.
//  - Bounding box/hierarchy; graph ontology.
//  - Reconcile drag handlers.
//  - Nodes as objects.
//  - Select/delete edges.
//  - Surface/form storybook; auto-size.
//  - Hide drag handles unless hovering; preview for handles (scale!).
//  - Dragging offset.
//  - Basic plugin with root object.
//  - Basic theme.

// TODO(burdon): Phase 2
//  - Factor out react-ui-xxx vs. plugin.
//  - Move all selected.
//  - Drop/snap visualization.
//  - Undo.
//  - Auto-layout (reconcile with plugin-debug).
//  - Resize frames.
//  - Group/collapse nodes; hierarchical editor.
//  - Inline edit.
//  - Grid options.
//  - Line options (1-to-many, inherits, etc.)
//  - Select multiple nodes.

/**
 * @internal
 */
// TODO(burdon): Use Radix.
export const CanvasContext = createContext<CanvasContext | undefined>(undefined);

type CanvasRootProps = ThemedClassName<PropsWithChildren>;

const CanvasRoot = ({ children, classNames }: CanvasRootProps) => {
  const [debug, setDebug] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dragging, setDragging] = useState<DraggingState>();
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
      value={{ debug, showGrid, snapToGrid, dragging, setDragging, editing, setEditing, handleAction }}
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
