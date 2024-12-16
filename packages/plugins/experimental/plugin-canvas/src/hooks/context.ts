//
// Copyright 2024 DXOS.org
//

import { createContext, type Dispatch, type SetStateAction } from 'react';

import { type SelectionModel } from './useSelected';
import { type GraphModel, type Shape, type ShapeType } from '../graph';
import type { Dimension, Point } from '../layout';

export type TransformState = {
  scale: number;
  offset: Point;
};

export type DraggingState = {
  container: HTMLElement;
  shape: ShapeType<'rect'>;
  anchor?: string;
};

export type EditingState = {
  shape: Shape;
};

export type EditorContextType = {
  debug: boolean;
  setDebug: Dispatch<SetStateAction<boolean>>;

  width: number;
  height: number;

  scale: number;
  offset: Point;
  setTransform: Dispatch<SetStateAction<TransformState>>;

  gridSize: Dimension;
  setGridSize: Dispatch<SetStateAction<Dimension>>;

  showGrid: boolean;
  setShowGrid: Dispatch<SetStateAction<boolean>>;

  graph: GraphModel;
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
