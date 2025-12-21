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
import { mx } from '@dxos/ui-theme';

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

const RootInner = <S extends Shape = Shape>(
  {
    children,
    classNames,
    id,
    options: optionsParam = defaultEditorOptions,
    debug: debugParam = false,
    showGrid: showGridParam = false,
    snapToGrid: snapToGridParam = false,
    graph: graphParam,
    graphMonitor,
    selection: selectionParam,
    registry: registryParam,
    layout: layoutParam,
    autoZoom,
  }: EditorRootProps<S>,
  forwardedRef: ForwardedRef<EditorController>,
) => {
  const options = useMemo(() => Object.assign({}, defaultEditorOptions, optionsParam), [optionsParam]);

  // External state.
  const graph = useMemo<CanvasGraphModel<S>>(() => graphParam ?? CanvasGraphModel.create(), [graphParam]);
  const clipboard = useMemo(() => CanvasGraphModel.create(), []);
  const selection = useMemo(() => selectionParam ?? new SelectionModel(), [selectionParam]);
  const registry = useMemo(() => registryParam ?? new ShapeRegistry(defaultShapes), [registryParam]);
  const layout = useMemo(() => layoutParam ?? new ShapeLayout(registry), [layoutParam, registry]);

  // Canvas state.
  const [debug, setDebug] = useState(debugParam);
  const [gridSize, setGridSize] = useState({ width: options.gridSize, height: options.gridSize });
  const [showGrid, setShowGrid] = useState(showGridParam);
  const [snapToGrid, setSnapToGrid] = useState(snapToGridParam);

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
        style={{ contain: 'layout' }}
        className={mx(
          'relative is-full bs-full overflow-hidden',
          ready ? 'transition-opacity delay-[0.5s] duration-[0.5s] opacity-100' : 'opacity-0',
          classNames,
        )}
      >
        {children}
      </div>
    </EditorContext.Provider>
  );
};

export const Root = forwardRef(RootInner) as <S extends Shape>(
  props: EditorRootProps<S> & { ref?: ForwardedRef<EditorController> },
) => ReturnType<typeof RootInner>;

export const Editor = {
  Root,
  Canvas,
  UI,
};

export type { EditorRootProps, EditorController };
