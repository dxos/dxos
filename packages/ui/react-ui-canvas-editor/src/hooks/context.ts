//
// Copyright 2024 DXOS.org
//

import { createContext, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { type Dimension } from '@dxos/react-ui-canvas';

import { type SelectionModel } from './selection';
import { type DragMonitor } from './useDragMonitor';
import { type ActionHandler } from '../actions';
import { type ShapeLayout, type ShapeRegistry } from '../components';
import type { CanvasGraphModel, Connection, Shape } from '../types';

export type EditingState<S extends Shape> = {
  shape: S;
};

export type EditorOptions = {
  gridSize: number;
  gridSnap: number;
  zoomFactor: number;
  zoomDuration: number;
};

/**
 * Model callback.
 */
export interface GraphMonitor<S extends Shape = Shape> {
  onCreate: (props: { graph: CanvasGraphModel<S>; node: S }) => void;
  onLink: (props: { graph: CanvasGraphModel<S>; edge: Connection }) => void;
  onDelete: (props: { graph: CanvasGraphModel<S>; subgraph: CanvasGraphModel<S> }) => void;
}

export type EditorContextType<S extends Shape = Shape> = {
  id: string;
  options: EditorOptions;
  registry: ShapeRegistry;
  layout: ShapeLayout;

  debug: boolean;
  setDebug: Dispatch<SetStateAction<boolean>>;

  gridSize: Dimension;
  setGridSize: Dispatch<SetStateAction<Dimension>>;

  showGrid: boolean;
  setShowGrid: Dispatch<SetStateAction<boolean>>;

  snapToGrid: boolean;
  setSnapToGrid: Dispatch<SetStateAction<boolean>>;

  graph: CanvasGraphModel<S>;
  graphMonitor?: GraphMonitor<S>;
  clipboard: CanvasGraphModel;
  selection: SelectionModel;

  ready: boolean;
  dragMonitor: DragMonitor;
  editing?: EditingState<S>;
  setEditing: Dispatch<SetStateAction<EditingState<S> | undefined>>;

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
