//
// Copyright 2024 DXOS.org
//

import { createContext, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { type GraphModel, type GraphNode } from '@dxos/graph';
import { type Dimension } from '@dxos/react-ui-canvas';

import { type SelectionModel } from './selection';
import { type ActionHandler } from '../actions';
import { type ShapeRegistry } from '../components';
import type { Polygon, Shape } from '../types';

// TODO(burdon): Reconcile with DragPayloadData.
export type DraggingState = {
  container: HTMLElement;
  shape: Polygon;
  anchor?: string;
};

export type EditingState = {
  shape: Polygon;
};

export type EditorOptions = {
  gridSize: number;
  gridSnap: number;
  zoomFactor: number;
  zoomDuration: number;
};

export type EditorContextType = {
  id: string;
  options: EditorOptions;
  registry: ShapeRegistry;

  overlaySvg: RefObject<SVGSVGElement>;

  actionHandler: ActionHandler | undefined;
  setActionHandler: (cb: ActionHandler | undefined) => void;

  debug: boolean;
  setDebug: Dispatch<SetStateAction<boolean>>;

  gridSize: Dimension;
  setGridSize: Dispatch<SetStateAction<Dimension>>;

  showGrid: boolean;
  setShowGrid: Dispatch<SetStateAction<boolean>>;

  graph: GraphModel<GraphNode<Shape>>;
  clipboard: GraphModel<GraphNode<Shape>>;
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
