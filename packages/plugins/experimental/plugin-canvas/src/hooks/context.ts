//
// Copyright 2024 DXOS.org
//

import { createContext, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { type GraphModel, type GraphNode } from '@dxos/graph';
import { type Dimension } from '@dxos/react-ui-canvas';

import { type SelectionModel } from './selection';
import { type DragMonitor } from './useDragMonitor';
import { type ActionHandler } from '../actions';
import { type ShapeRegistry } from '../components';
import type { Polygon, Shape } from '../types';

export type EditingState<S extends Polygon> = {
  shape: S;
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

  debug: boolean;
  setDebug: Dispatch<SetStateAction<boolean>>;

  gridSize: Dimension;
  setGridSize: Dispatch<SetStateAction<Dimension>>;

  showGrid: boolean;
  setShowGrid: Dispatch<SetStateAction<boolean>>;

  snapToGrid: boolean;
  setSnapToGrid: Dispatch<SetStateAction<boolean>>;

  graph: GraphModel<GraphNode<Shape>>;
  clipboard: GraphModel<GraphNode<Shape>>;
  selection: SelectionModel;

  monitor: DragMonitor;
  editing?: EditingState<any>;
  setEditing: Dispatch<SetStateAction<EditingState<any> | undefined>>;

  actionHandler: ActionHandler | undefined;
  setActionHandler: (cb: ActionHandler | undefined) => void;

  overlayRef: RefObject<SVGSVGElement>;
  repaint: () => void;
};

/**
 * @internal
 */
// TODO(burdon): Use Radix.
export const EditorContext = createContext<EditorContextType | undefined>(undefined);
