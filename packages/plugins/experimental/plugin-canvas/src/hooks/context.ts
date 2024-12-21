//
// Copyright 2024 DXOS.org
//

import { createContext, type Dispatch, type SetStateAction } from 'react';

import { type Dimension } from '@dxos/react-ui-canvas';

import { type SelectionModel } from './useSelected';
import { type GraphModel, type Node } from '../graph';
import type { PolygonShape, Shape } from '../types';

// TODO(burdon): Reconcile with DragPayloadData.
export type DraggingState = {
  container: HTMLElement;
  shape: PolygonShape;
  anchor?: string;
};

export type EditingState = {
  shape: PolygonShape;
};

export type EditorOptions = {
  zoomFactor: number;
  gridSize: number;
};

export type EditorContextType = {
  id: string;
  debug: boolean;
  setDebug: Dispatch<SetStateAction<boolean>>;
  options: EditorOptions;

  gridSize: Dimension;
  setGridSize: Dispatch<SetStateAction<Dimension>>;

  showGrid: boolean;
  setShowGrid: Dispatch<SetStateAction<boolean>>;

  graph: GraphModel<Node<Shape>>;
  selection: SelectionModel;

  snapToGrid: boolean;
  setSnapToGrid: Dispatch<SetStateAction<boolean>>;

  dragging?: DraggingState;
  setDragging: Dispatch<SetStateAction<DraggingState | undefined>>;

  linking?: DraggingState;
  setLinking: Dispatch<SetStateAction<DraggingState | undefined>>;

  editing?: EditingState;
  setEditing: Dispatch<SetStateAction<EditingState | undefined>>;
};

/**
 * @internal
 */
// TODO(burdon): Use Radix.
export const EditorContext = createContext<EditorContextType | undefined>(undefined);
