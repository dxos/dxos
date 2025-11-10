//
// Copyright 2024 DXOS.org
//

import React, {
  type ForwardedRef,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SelectionModel } from '@dxos/graph';
import { type ThemedClassName } from '@dxos/react-ui';
import { testId } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { type ActionHandler } from '../../actions';
import { DragMonitor, type EditingState, EditorContext, type EditorContextType, type EditorOptions } from '../../hooks';
import { defaultShapes } from '../../shapes';
import { CanvasGraphModel, type Shape } from '../../types';
import { Canvas, ShapeLayout, ShapeRegistry } from '../Canvas';
import { type TestId } from '../defs';
import { UI } from '../UI';

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

type EditorRootProps<S extends Shape = Shape> = ThemedClassName<
  PropsWithChildren<
    Pick<EditorContextType<S>, 'id'> &
      Partial<
        Pick<
          EditorContextType<S>,
          | 'options'
          | 'debug'
          | 'showGrid'
          | 'snapToGrid'
          | 'graph'
          | 'graphMonitor'
          | 'selection'
          | 'registry'
          | 'layout'
        >
      > & {
        autoZoom?: boolean;
      }
  >
>;

const EditorRootWithType = <S extends Shape = Shape>(
  {
    children,
    classNames,
    id,
    options: _options = defaultEditorOptions,
    debug: _debug = false,
    showGrid: _showGrid = false,
    snapToGrid: _snapToGrid = false,
    graph: _graph,
    graphMonitor,
    selection: _selection,
    registry: _registry,
    layout: _layout,
    autoZoom,
  }: EditorRootProps<S>,
  forwardedRef: ForwardedRef<EditorController>,
) => {
  const options = useMemo(() => Object.assign({}, defaultEditorOptions, _options), [_options]);

  // External state.
  const graph = useMemo<CanvasGraphModel<S>>(() => _graph ?? CanvasGraphModel.create(), [_graph]);
  const clipboard = useMemo(() => CanvasGraphModel.create(), []);
  const selection = useMemo(() => _selection ?? new SelectionModel(), [_selection]);
  const registry = useMemo(() => _registry ?? new ShapeRegistry(defaultShapes), [_registry]);
  const layout = useMemo(() => _layout ?? new ShapeLayout(registry), [_layout, registry]);

  // Canvas state.
  const [debug, setDebug] = useState(_debug);
  const [gridSize, setGridSize] = useState({ width: options.gridSize, height: options.gridSize });
  const [showGrid, setShowGrid] = useState(_showGrid);
  const [snapToGrid, setSnapToGrid] = useState(_snapToGrid);

  // Repaint.
  const [, forceUpdate] = useState({});
  const repaint = useCallback(() => {}, []);

  // Canvas layout.
  const overlayRef = useRef<SVGSVGElement>(null);

  // Editor state.
  const [ready, setReady] = useState(!autoZoom);
  const [dragMonitor] = useState(() => new DragMonitor());
  const [editing, setEditing] = useState<EditingState<any>>();

  // Actions.
  const [actionHandler, setActionHandler] = useState<ActionHandler>();

  const context: EditorContextType<S> = {
    id,
    options,
    registry,
    layout,

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
  useImperativeHandle(forwardedRef, () => {
    return {
      action: actionHandler,
      zoomToFit: () => {
        requestAnimationFrame(() => {
          void actionHandler?.({ type: 'zoom-to-fit', duration: 0 });
        });
      },
      update: () => forceUpdate({}),
    };
  }, [actionHandler]);

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
    <EditorContext.Provider value={context as EditorContextType}>
      <div
        {...testId<TestId>('dx-editor')}
        tabIndex={0}
        className={mx(
          'relative is-full bs-full overflow-hidden',
          ready ? 'transition-opacity delay-[1s] duration-[1s] opacity-100' : 'opacity-0',
          classNames,
        )}
        style={{ contain: 'layout' }}
      >
        {children}
      </div>
    </EditorContext.Provider>
  );
};

export const EditorRoot = forwardRef(EditorRootWithType) as <S extends Shape>(
  props: EditorRootProps<S> & { ref?: ForwardedRef<EditorController> },
) => ReturnType<typeof EditorRootWithType>;

export const Editor = {
  Root: EditorRoot,
  Canvas,
  UI,
};

export type { EditorRootProps, EditorController };
