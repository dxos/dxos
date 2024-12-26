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

// TODO(burdon): Remove.
export type LinkingState<S extends Polygon> = {
  container: HTMLElement;
  shape: S;
  anchor?: string;
};

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

  overlaySvg: RefObject<SVGSVGElement>;
  repaint: () => void;

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

  monitor: DragMonitor;
  // TODO(burdon): Remove.
  linking?: LinkingState<any>;
  setLinking: Dispatch<SetStateAction<LinkingState<any> | undefined>>;

  editing?: EditingState<any>;
  setEditing: Dispatch<SetStateAction<EditingState<any> | undefined>>;
};

/**
 * @internal
 */
// TODO(burdon): Use Radix.
export const EditorContext = createContext<EditorContextType | undefined>(undefined);
