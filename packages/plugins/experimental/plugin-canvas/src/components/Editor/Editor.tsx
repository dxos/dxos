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
  useCallback,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { testId } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { type ActionHandler } from '../../actions';
import {
  DragMonitor,
  type EditingState,
  EditorContext,
  type EditorContextType,
  type EditorOptions,
  SelectionModel,
} from '../../hooks';
import { defaultShapes } from '../../shapes';
import { type CanvasGraphModel, createCanvasGraphModel } from '../../types';
import { Canvas, ShapeRegistry } from '../Canvas';
import { UI } from '../UI';
import { type TestId } from '../defs';

export const defaultEditorOptions: EditorOptions = {
  gridSize: 16,
  gridSnap: 16,
  zoomFactor: 2,
  zoomDuration: 300,
};

interface EditorController {
  action?: ActionHandler;
  zoomToFit(): void;
  update(): void;
}

type EditorRootProps = ThemedClassName<
  PropsWithChildren<
    Pick<EditorContextType, 'id'> &
      Partial<
        Pick<
          EditorContextType,
          'options' | 'debug' | 'showGrid' | 'snapToGrid' | 'graph' | 'graphMonitor' | 'selection' | 'registry'
        >
      > & {
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
      showGrid: _showGrid = true,
      snapToGrid: _snapToGrid = true,
      graph: _graph,
      graphMonitor,
      selection: _selection,
      registry: _registry,
      autoZoom,
    },
    forwardedRef,
  ) => {
    const options = useMemo(() => Object.assign({}, defaultEditorOptions, _options), [_options]);

    // External state.
    const graph = useMemo<CanvasGraphModel>(() => _graph ?? createCanvasGraphModel(), [_graph]);
    const clipboard = useMemo(() => createCanvasGraphModel(), []);
    const selection = useMemo(() => _selection ?? new SelectionModel(), [_selection]);
    const registry = useMemo(() => _registry ?? new ShapeRegistry(defaultShapes), [_registry]);

    // Canvas state.
    const [debug, setDebug] = useState(_debug);
    const [gridSize, setGridSize] = useState({ width: options.gridSize, height: options.gridSize });
    const [showGrid, setShowGrid] = useState(_showGrid);
    const [snapToGrid, setSnapToGrid] = useState(_snapToGrid);

    // Repaint.
    const [, forceUpdate] = useState({});
    const repaint = useCallback(() => forceUpdate({}), []);

    // Canvas layout.
    const overlayRef = useRef<SVGSVGElement>(null);

    // Editor state.
    const [ready, setReady] = useState(!autoZoom);
    const [dragMonitor] = useState(() => new DragMonitor());
    const [editing, setEditing] = useState<EditingState<any>>();

    // Actions.
    const [actionHandler, setActionHandler] = useState<ActionHandler>();

    const context: EditorContextType = {
      id,
      options,
      registry,

      graph,
      graphMonitor,
      clipboard,
      selection,

      debug,
      gridSize,
      showGrid,
      snapToGrid,
      setDebug,
      setGridSize,
      setShowGrid,
      setSnapToGrid,

      ready,
      dragMonitor,
      editing,
      setEditing,

      actionHandler,
      setActionHandler: (handler) => setActionHandler(() => handler),

      overlayRef,
      repaint,
    };

    // Controller.
    useImperativeHandle(
      forwardedRef,
      () => {
        return {
          action: actionHandler,
          zoomToFit: () => {
            requestAnimationFrame(() => {
              void actionHandler?.({ type: 'zoom-to-fit', duration: 0 });
            });
          },
          update: () => forceUpdate({}),
        };
      },
      [actionHandler],
    );

    // Trigger on graph change.
    useEffect(() => {
      if (autoZoom) {
        requestAnimationFrame(async () => {
          await actionHandler?.({ type: 'zoom-to-fit', duration: 0 });
          setReady(true);
        });
      }
    }, [actionHandler, graph, autoZoom]);

    return (
      <EditorContext.Provider value={context}>
        <div
          {...testId<TestId>('dx-editor')}
          tabIndex={0}
          className={mx(
            'relative w-full h-full overflow-hidden',
            ready ? 'transition-opacity delay-[1s] duration-[1s] opacity-100' : 'opacity-0',
            classNames,
          )}
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
