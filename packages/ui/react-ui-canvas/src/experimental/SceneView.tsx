//
// Copyright 2026 DXOS.org
//

// THROWAWAY SPIKE: see ./types.ts.

import { linkHorizontal } from 'd3';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { GridComponent } from '../components/Grid/index.ts';
import {
  animateCamera,
  cameraTransform,
  cellBounds,
  coverage,
  enterPortal,
  exitPortal,
  fitBounds,
  portalScale,
  portalTransform,
  screenToScene,
  zoomAt,
} from './camera.ts';
import {
  type Camera,
  type Cell,
  type LinkCell,
  type PlacedCell,
  type Scene,
  type SceneCell,
  type SceneStore,
  type Size,
  isPlaced,
} from './types.ts';

/** Screen px below which a portal is a solid tile; above `PREVIEW_PX` it mounts the child scene live. */
const DOT_PX = 40;
const PREVIEW_PX = 260;
/** Root plus this many live nested levels. */
const MAX_LIVE_DEPTH = 1;
const AUTO_ENTER = 0.85;
const AUTO_EXIT = 0.3;

type Tier = 'dot' | 'preview' | 'live';

const tierFor = (cell: SceneCell, zoom: number, depth: number): Tier => {
  const px = Math.min(cell.size.width, cell.size.height) * zoom;
  if (px < DOT_PX) {
    return 'dot';
  }
  if (px < PREVIEW_PX || depth >= MAX_LIVE_DEPTH) {
    return 'preview';
  }
  return 'live';
};

const link = linkHorizontal<unknown, { x: number; y: number }>()
  .x((point) => point.x)
  .y((point) => point.y);

const linkPath = (cells: Record<string, Cell>, edge: LinkCell) => {
  const source = cells[edge.source];
  const target = cells[edge.target];
  if (!source || !target || !isPlaced(source) || !isPlaced(target)) {
    return undefined;
  }
  const from = { x: source.center.x + source.size.width / 2, y: source.center.y };
  const to = { x: target.center.x - target.size.width / 2, y: target.center.y };
  return link({ source: from, target: to }) ?? undefined;
};

type CellHandlers = {
  onPointerDown?: (cell: PlacedCell, event: React.PointerEvent) => void;
  onDoubleClick?: (cell: SceneCell) => void;
};

type SceneLayerProps = {
  store: SceneStore;
  scene: Scene;
  /** Effective screen zoom of this layer (camera zoom × portal scales), for tier selection. */
  zoom: number;
  depth: number;
  selected?: ReadonlySet<string>;
  handlers?: CellHandlers;
};

/** Renders one scene's cells in scene coordinates; nests itself for live portals. */
const SceneLayer = memo(({ store, scene, zoom, depth, selected, handlers }: SceneLayerProps) => {
  const cells = useMemo(() => Object.values(scene.cells), [scene.cells]);
  const placed = useMemo(() => cells.filter(isPlaced).sort((a, b) => a.z - b.z), [cells]);
  const links = useMemo(() => cells.filter((cell): cell is LinkCell => cell.kind === 'link'), [cells]);

  return (
    <>
      <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
        {links.map((edge) => {
          const path = linkPath(scene.cells, edge);
          return path ? (
            <path
              key={edge.id}
              d={path}
              className='fill-none stroke-neutral-500'
              strokeWidth={2 / Math.max(zoom, 0.05)}
            />
          ) : null;
        })}
      </svg>
      {placed.map((cell) => (
        <CellView
          key={cell.id}
          store={store}
          cell={cell}
          zoom={zoom}
          depth={depth}
          selected={selected?.has(cell.id) ?? false}
          handlers={handlers}
        />
      ))}
    </>
  );
});

SceneLayer.displayName = 'SceneLayer';

type CellViewProps = {
  store: SceneStore;
  cell: PlacedCell;
  zoom: number;
  depth: number;
  selected: boolean;
  handlers?: CellHandlers;
};

const CellView = memo(({ store, cell, zoom, depth, selected, handlers }: CellViewProps) => {
  const bounds = cellBounds(cell);
  const interactive = handlers !== undefined;
  const style = { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height };
  const frame = mx(
    'absolute box-border rounded-sm border-2 overflow-hidden',
    selected ? 'border-primary-500' : 'border-separator',
    interactive && 'cursor-grab',
  );

  switch (cell.kind) {
    case 'rect':
      return (
        <div
          className={mx(frame, 'bg-base-surface flex items-center justify-center')}
          style={style}
          onPointerDown={interactive ? (event) => handlers.onPointerDown?.(cell, event) : undefined}
        >
          <span className='text-lg'>{cell.label}</span>
        </div>
      );
    case 'text':
      return (
        <div
          className={mx(frame, 'bg-input-surface p-3 text-description')}
          style={style}
          onPointerDown={interactive ? (event) => handlers.onPointerDown?.(cell, event) : undefined}
        >
          {cell.text}
        </div>
      );
    case 'scene': {
      const child = store[cell.scene];
      const tier = child ? tierFor(cell, zoom, depth) : 'dot';
      return (
        <div
          className={mx(frame, 'bg-hover-surface', tier === 'dot' && 'bg-primary-500/40')}
          style={style}
          onPointerDown={interactive ? (event) => handlers.onPointerDown?.(cell, event) : undefined}
          onDoubleClick={interactive ? () => handlers.onDoubleClick?.(cell) : undefined}
        >
          {tier === 'preview' && child && (
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none'>
              <span className='text-2xl'>{child.name}</span>
              <span className='text-description'>{Object.keys(child.cells).length} cells</span>
            </div>
          )}
          {tier === 'live' &&
            child && (
              // The nested layer is read-only: only the root scene receives handlers.
              <div
                className='absolute pointer-events-none'
                style={{ transform: portalTransform(cell, child), transformOrigin: '0 0' }}
              >
                <SceneLayer store={store} scene={child} zoom={zoom * portalScale(cell, child)} depth={depth + 1} />
              </div>
            )}
          <span className='absolute top-1 left-2 text-xs text-subdued pointer-events-none'>{child?.name}</span>
        </div>
      );
    }
  }
});

CellView.displayName = 'CellView';

type Drag =
  | { kind: 'pan'; last: { x: number; y: number } }
  | { kind: 'move'; last: { x: number; y: number }; ids: string[] };

export type SceneViewProps = {
  store: SceneStore;
  root: string;
};

/**
 * Root view: owns the camera, the scene path (breadcrumbs) and selection; renders the current scene through
 * `SceneLayer` under one CSS transform and drills in/out of portals with a camera transition then a root swap.
 */
export const SceneView = ({ store: initialStore, root }: SceneViewProps) => {
  const [store, setStore] = useState(initialStore);
  const [path, setPath] = useState<string[]>([root]);
  const [camera, setCameraState] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(camera);
  const cancelRef = useRef<() => void>(undefined);
  const dragRef = useRef<Drag>(undefined);

  const scene = store[path[path.length - 1]];

  const setCamera = useCallback((next: Camera | ((camera: Camera) => Camera)) => {
    const value = typeof next === 'function' ? next(cameraRef.current) : next;
    cameraRef.current = value;
    setCameraState(value);
  }, []);

  const animateTo = useCallback(
    (target: Camera, done?: () => void) => {
      cancelRef.current?.();
      cancelRef.current = animateCamera(cameraRef.current, target, viewport, setCamera, () => {
        cancelRef.current = undefined;
        done?.();
      });
    },
    [viewport, setCamera],
  );

  // Viewport size.
  useEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keep the scene fitted while the viewport settles (the first ResizeObserver entry can be a stub size),
  // until the user takes the camera over.
  const interactedRef = useRef(false);
  useEffect(() => {
    if (!interactedRef.current && viewport.width > 0 && viewport.height > 0) {
      setCamera(fitBounds(scene.bounds, viewport, 40));
    }
  }, [viewport, scene.bounds, setCamera]);

  // Wheel: pinch (ctrl/cmd) zooms about the cursor, otherwise pans. Non-passive so the page never scrolls.
  useEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      interactedRef.current = true;
      cancelRef.current?.();
      const rect = element.getBoundingClientRect();
      const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (event.ctrlKey || event.metaKey) {
        setCamera((camera) => zoomAt(camera, pointer, camera.zoom * Math.exp(-event.deltaY * 0.01)));
      } else {
        setCamera((camera) => ({
          ...camera,
          x: camera.x - event.deltaX / camera.zoom,
          y: camera.y - event.deltaY / camera.zoom,
        }));
      }
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [setCamera]);

  const portalFor = useCallback(
    (parent: Scene, childId: string) =>
      Object.values(parent.cells).find((cell): cell is SceneCell => cell.kind === 'scene' && cell.scene === childId),
    [],
  );

  const drillIn = useCallback(
    (cell: SceneCell, animate = true) => {
      const child = store[cell.scene];
      if (!child) {
        return;
      }
      interactedRef.current = true;
      const swap = (camera: Camera) => {
        setPath((path) => [...path, child.id]);
        setSelected(new Set());
        setCamera(enterPortal(camera, cell, child));
      };
      if (animate) {
        const target = fitBounds(cellBounds(cell), viewport);
        animateTo(target, () => swap(target));
      } else {
        swap(cameraRef.current);
      }
    },
    [store, viewport, animateTo, setCamera],
  );

  const drillOut = useCallback(
    (animate = true) => {
      if (path.length < 2) {
        return;
      }
      const parent = store[path[path.length - 2]];
      const cell = portalFor(parent, scene.id);
      if (!cell) {
        return;
      }
      setPath((path) => path.slice(0, -1));
      setSelected(new Set());
      setCamera(exitPortal(cameraRef.current, cell, scene));
      if (animate) {
        animateTo(fitBounds(parent.bounds, viewport, 40));
      }
    },
    [path, store, scene, portalFor, viewport, animateTo, setCamera],
  );

  // Auto drill: a portal filling the viewport becomes the root; a root shrunk to a corner yields to its parent.
  useEffect(() => {
    if (cancelRef.current || viewport.width === 0) {
      return;
    }
    const timer = setTimeout(() => {
      const portal = Object.values(scene.cells).find(
        (cell): cell is SceneCell =>
          cell.kind === 'scene' && coverage(camera, cellBounds(cell), viewport) >= AUTO_ENTER,
      );
      if (portal) {
        drillIn(portal, false);
      } else if (path.length > 1 && coverage(camera, scene.bounds, viewport) < AUTO_EXIT) {
        drillOut(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [camera, scene, path.length, viewport, drillIn, drillOut]);

  // Pointer: drag on the background pans; drag on a cell moves the selection.
  const onBackgroundPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.target !== event.currentTarget || event.button !== 0) {
      return;
    }
    interactedRef.current = true;
    cancelRef.current?.();
    setSelected(new Set());
    dragRef.current = { kind: 'pan', last: { x: event.clientX, y: event.clientY } };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onCellPointerDown = useCallback(
    (cell: PlacedCell, event: React.PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      cancelRef.current?.();
      const next = new Set(event.shiftKey ? selected : selected.has(cell.id) ? selected : []);
      if (event.shiftKey && selected.has(cell.id)) {
        next.delete(cell.id);
      } else {
        next.add(cell.id);
      }
      setSelected(next);
      dragRef.current = { kind: 'move', last: { x: event.clientX, y: event.clientY }, ids: [...next] };
      rootRef.current?.setPointerCapture(event.pointerId);
    },
    [selected],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const dx = (event.clientX - drag.last.x) / cameraRef.current.zoom;
      const dy = (event.clientY - drag.last.y) / cameraRef.current.zoom;
      drag.last = { x: event.clientX, y: event.clientY };
      if (drag.kind === 'pan') {
        setCamera((camera) => ({ ...camera, x: camera.x + dx, y: camera.y + dy }));
      } else {
        setStore((store) => {
          const cells = { ...store[scene.id].cells };
          for (const id of drag.ids) {
            const cell = cells[id];
            if (cell && isPlaced(cell)) {
              cells[id] = { ...cell, center: { x: cell.center.x + dx, y: cell.center.y + dy } };
            }
          }
          return { ...store, [scene.id]: { ...store[scene.id], cells } };
        });
      }
    },
    [scene.id, setCamera],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = undefined;
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        drillOut();
      } else if (event.key === '1' && event.shiftKey) {
        animateTo(fitBounds(scene.bounds, viewport, 40));
      }
    },
    [drillOut, animateTo, scene.bounds, viewport],
  );

  const handlers = useMemo<CellHandlers>(
    () => ({ onPointerDown: onCellPointerDown, onDoubleClick: drillIn }),
    [onCellPointerDown, drillIn],
  );

  const pointer = useMemo(
    () => screenToScene(camera, { x: viewport.width / 2, y: viewport.height / 2 }),
    [camera, viewport],
  );

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className='relative w-full h-full overflow-hidden bg-base-surface outline-none touch-none select-none'
      style={{ contain: 'strict' }}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <GridComponent
        size={16}
        scale={camera.zoom}
        offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
        showAxes={false}
      />
      <div
        className='absolute pointer-events-none'
        style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
      >
        <div
          className='absolute border border-dashed border-separator pointer-events-none'
          style={{ left: scene.bounds.x, top: scene.bounds.y, width: scene.bounds.width, height: scene.bounds.height }}
        />
        <div className='pointer-events-auto'>
          <SceneLayer
            store={store}
            scene={scene}
            zoom={camera.zoom}
            depth={0}
            selected={selected}
            handlers={handlers}
          />
        </div>
      </div>

      <div className='absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded-sm bg-modal-surface border border-separator text-sm'>
        <Button variant='ghost' disabled={path.length < 2} onClick={() => drillOut()}>
          Up
        </Button>
        <span className='font-mono'>{path.map((id) => store[id]?.name ?? id).join(' › ')}</span>
        <Button variant='ghost' onClick={() => animateTo(fitBounds(scene.bounds, viewport, 40))}>
          Fit
        </Button>
        <span className='text-description font-mono'>
          {Math.round(camera.zoom * 100)}% · ({Math.round(pointer.x)}, {Math.round(pointer.y)}) · depth{' '}
          {path.length - 1}
        </span>
      </div>
    </div>
  );
};
