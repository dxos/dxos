//
// Copyright 2024 DXOS.org
//

import React, {
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { GraphModel, type GraphNode } from '@dxos/graph';
import { type ThemedClassName } from '@dxos/react-ui';
import { testId } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { type ActionHandler } from '../../actions';
import {
  type DraggingState,
  type EditingState,
  EditorContext,
  type EditorContextType,
  type EditorOptions,
  SelectionModel,
} from '../../hooks';
import { type Shape } from '../../types';
import { Canvas } from '../Canvas';
import { UI } from '../UI';
import { type TestId } from '../defs';

export const defaultEditorOptions: EditorOptions = {
  gridSize: 16,
  gridSnap: 32,
  zoomFactor: 2,
  zoomDuration: 300,
};

interface EditorController {
  zoomToFit(): void;
}

type EditorRootProps = ThemedClassName<
  PropsWithChildren<
    Partial<Pick<EditorContextType, 'options' | 'debug' | 'graph'>> & {
      id: string;
      selection?: SelectionModel;
      autoZoom?: boolean;
    }
  >
>;

const EditorRoot = forwardRef<EditorController, EditorRootProps>(
  (
    {
      children,
      classNames,
      id,
      options: _options = defaultEditorOptions,
      debug: _debug = false,
      graph: _graph,
      selection: _selection,
      autoZoom,
    },
    forwardedRef,
  ) => {
    // External state.
    const graph = useMemo<GraphModel<GraphNode<Shape>>>(() => _graph ?? new GraphModel<GraphNode<Shape>>(), [_graph]);
    const clipboard = useMemo<GraphModel>(() => new GraphModel<GraphNode<Shape>>(), []);
    const selection = useMemo(() => _selection ?? new SelectionModel(), [_selection]);
    const options = useMemo(() => Object.assign({}, defaultEditorOptions, _options), [_options]);

    // Canvas state.
    const [debug, setDebug] = useState(_debug);
    const [gridSize, setGridSize] = useState({ width: options.gridSize, height: options.gridSize });
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);

    // Canvas layout.
    const overlaySvg = useRef<SVGSVGElement>(null);

    // Editor state.
    const [dragging, setDragging] = useState<DraggingState>();
    const [linking, setLinking] = useState<DraggingState>();
    const [editing, setEditing] = useState<EditingState>();

    // Actions.
    const [actionHandler, setActionHandler] = useState<ActionHandler>();

    const context: EditorContextType = {
      id,
      options,

      graph,
      clipboard,
      selection,

      overlaySvg,

      actionHandler,
      setActionHandler: (handler) => setActionHandler(() => handler),

      debug,
      gridSize,
      showGrid,
      snapToGrid,
      setDebug,
      setGridSize,
      setShowGrid,
      setSnapToGrid,

      dragging,
      linking,
      editing,
      setDragging,
      setLinking,
      setEditing,
    };

    // Controller.
    useImperativeHandle(
      forwardedRef,
      () => {
        return {
          zoomToFit: () => {
            requestAnimationFrame(() => {
              void actionHandler?.({ type: 'zoom-to-fit', duration: 0 });
            });
          },
        };
      },
      [actionHandler],
    );

    // Trigger on graph change.
    useEffect(() => {
      if (graph.nodes.length && autoZoom) {
        setTimeout(() => {
          void actionHandler?.({ type: 'zoom-to-fit', duration: 0 });
        });
      }
    }, [actionHandler, graph, autoZoom]);

    return (
      <EditorContext.Provider value={context}>
        <div
          {...testId<TestId>('dx-editor')}
          tabIndex={0}
          className={mx('relative w-full h-full overflow-hidden', classNames)}
        >
          {children}
        </div>
      </EditorContext.Provider>
    );
  },
);

export const Editor = {
  Root: EditorRoot,
  Canvas,
  UI,
};

export type { EditorRootProps, EditorController };
