//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Button, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { GridComponent } from '../components/Grid/index.ts';
import { type Drag, type Handle, type SceneViewAtoms, createSceneViewAtoms } from './atoms.ts';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import {
  animateCamera,
  cameraTransform,
  cellBounds,
  coverage,
  enterPortal,
  exitPortal,
  fitBounds,
  panBy,
  screenToScene,
  zoomAt,
} from './camera.ts';
import { ControlFrame, handlePoint } from './ControlFrame.tsx';
import { boundsFromPoints, cellsIntersecting, hitTest, sceneBounds, unionBounds } from './hit.ts';
import { useRegistry, useSceneProjection, useViewport, useWheel } from './hooks.ts';
import { topZ } from './order.ts';
import { Palette, toolForKey } from './Palette.tsx';
import { portPoint } from './ports.ts';
import { type FreehandProjectionOptions, type Projection, reduceIntent } from './projection.ts';
import { type CellRegistry, defaultRegistry } from './registry.ts';
import { type CellHandlers, SceneLayer } from './SceneLayer.tsx';
import { type SceneStore } from './store.ts';
import {
  type Bounds,
  type Camera,
  type Cell,
  type CellId,
  type Endpoint,
  type PlacedCell,
  type Point,
  type Port,
  type Scene,
  type SceneId,
  type Size,
  type Tool,
  isPlaced,
} from './types.ts';

const AUTO_ENTER = 0.85;
const AUTO_EXIT = 0.3;
const AUTO_DRILL_MS = 150;
const FIT_INSET = 40;
const PORT_SNAP_PX = 16;
const DEFAULT_CELL: Size = { width: 160, height: 100 };

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const resizeBounds = (start: Bounds, handle: Handle, delta: Point, minSize: Size): Bounds => {
  let { x, y, width, height } = start;
  if (handle.includes('e')) {
    width = Math.max(minSize.width, width + delta.x);
  }
  if (handle.includes('s')) {
    height = Math.max(minSize.height, height + delta.y);
  }
  if (handle.includes('w')) {
    const next = Math.max(minSize.width, width - delta.x);
    x += width - next;
    width = next;
  }
  if (handle.includes('n')) {
    const next = Math.max(minSize.height, height - delta.y);
    y += height - next;
    height = next;
  }
  return { x, y, width, height };
};

export type SceneViewProps = ThemedClassName<{
  store: SceneStore;
  root: SceneId;
  registry?: CellRegistry;
  /** Projection per scene; freehand (identity) by default. */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** Externally owned view state, e.g. to drive two views or persist the camera. */
  atoms?: SceneViewAtoms;
  /** Grid spacing in scene px; also the snap unit. */
  grid?: number;
  showPalette?: boolean;
}>;

export const SceneView = ({
  classNames,
  store,
  root,
  registry: cellRegistry = defaultRegistry,
  createProjection,
  atoms: atomsProp,
  grid = 16,
  showPalette = true,
}: SceneViewProps) => {
  const registry = useRegistry();
  const atoms = useMemo(() => atomsProp ?? createSceneViewAtoms(root), [atomsProp, root]);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport(rootRef);

  const path = useAtomValue(atoms.path);
  const projection = useSceneProjection({ store, atoms, createProjection });
  const scene = useAtomValue(projection.scene);
  const scenes = useAtomValue(store.scenes);
  const camera = useAtomValue(atoms.camera);
  const selection = useAtomValue(atoms.selection);
  const hover = useAtomValue(atoms.hover);
  const tool = useAtomValue(atoms.tool);
  const snapEnabled = useAtomValue(atoms.snap);
  const drag = useAtomValue(atoms.drag);

  const nameOf = useCallback((id: SceneId) => scenes[id]?.name ?? id, [scenes]);
  const bounds = useMemo(() => sceneBounds(scene), [scene]);
  const capabilities = projection.capabilities;

  //
  // Camera.
  //

  const setCamera = useCallback(
    (next: Camera | ((camera: Camera) => Camera)) => {
      registry.set(atoms.camera, typeof next === 'function' ? next(registry.get(atoms.camera)) : next);
    },
    [registry, atoms.camera],
  );

  // Clears the ref as well: a cancelled frame never runs the completion callback that would.
  const cancelRef = useRef<() => void>(undefined);
  const cancelAnimation = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = undefined;
  }, []);

  const animateTo = useCallback(
    (target: Camera, done?: () => void) => {
      cancelAnimation();
      cancelRef.current = animateCamera(registry.get(atoms.camera), target, viewport, setCamera, () => {
        cancelRef.current = undefined;
        done?.();
      });
    },
    [registry, atoms.camera, viewport, setCamera, cancelAnimation],
  );

  // Keep the scene fitted while the viewport settles, until the user takes the camera over.
  const interactedRef = useRef(false);
  useEffect(() => {
    if (!interactedRef.current && viewport.width > 0 && viewport.height > 0) {
      setCamera(fitBounds(bounds, viewport, FIT_INSET));
    }
  }, [viewport, bounds, setCamera]);

  useWheel(
    rootRef,
    useCallback(
      (event, pointer) => {
        interactedRef.current = true;
        cancelAnimation();
        if (event.ctrlKey || event.metaKey) {
          setCamera((camera) => zoomAt(camera, pointer, camera.zoom * Math.exp(-event.deltaY * 0.01)));
        } else {
          setCamera((camera) => panBy(camera, { x: -event.deltaX / camera.zoom, y: -event.deltaY / camera.zoom }));
        }
      },
      [setCamera, cancelAnimation],
    ),
  );

  //
  // Navigation.
  //

  const pushHistory = useCallback(
    (entry: { path: SceneId[]; camera: Camera }) => {
      const history = registry.get(atoms.history);
      const entries = [...history.entries.slice(0, history.index + 1), entry];
      registry.set(atoms.history, { entries, index: entries.length - 1 });
    },
    [registry, atoms.history],
  );

  const select = useCallback(
    (ids: Iterable<CellId>) => registry.set(atoms.selection, new Set(ids)),
    [registry, atoms.selection],
  );

  const drillIn = useCallback(
    (cell: PlacedCell, animate = true) => {
      const child = cell.kind === 'scene' ? scenes[cell.scene] : undefined;
      if (!child) {
        return;
      }
      interactedRef.current = true;
      const childBounds = sceneBounds(child);
      const swap = (camera: Camera) => {
        const next = enterPortal(camera, cell, childBounds);
        registry.set(atoms.path, [...registry.get(atoms.path), child.id]);
        select([]);
        setCamera(next);
        pushHistory({ path: registry.get(atoms.path), camera: next });
      };
      if (animate) {
        const target = fitBounds(cellBounds(cell), viewport);
        animateTo(target, () => swap(target));
      } else {
        swap(registry.get(atoms.camera));
      }
    },
    [scenes, registry, atoms.path, atoms.camera, viewport, animateTo, setCamera, select, pushHistory],
  );

  const drillOut = useCallback(
    (levels = 1, animate = true) => {
      const current = registry.get(atoms.path);
      if (current.length < 2 || levels < 1) {
        return;
      }
      let camera = registry.get(atoms.camera);
      let next = current;
      for (let level = 0; level < levels && next.length > 1; level++) {
        const child = scenes[next[next.length - 1]];
        const parent = scenes[next[next.length - 2]];
        const portal = parent
          ? Object.values(parent.cells).find(
              (cell): cell is PlacedCell => cell.kind === 'scene' && cell.scene === child?.id,
            )
          : undefined;
        if (!child || !portal) {
          break;
        }
        camera = exitPortal(camera, portal, sceneBounds(child));
        next = next.slice(0, -1);
      }
      registry.set(atoms.path, next);
      select([]);
      setCamera(camera);
      const parent = scenes[next[next.length - 1]];
      if (animate && parent) {
        animateTo(fitBounds(sceneBounds(parent), viewport, FIT_INSET));
      }
      pushHistory({ path: next, camera });
    },
    [registry, atoms.path, atoms.camera, scenes, viewport, animateTo, setCamera, select, pushHistory],
  );

  const goHistory = useCallback(
    (offset: number) => {
      const history = registry.get(atoms.history);
      const index = history.index + offset;
      const entry = history.entries[index];
      if (!entry) {
        return;
      }
      registry.set(atoms.history, { ...history, index });
      registry.set(atoms.path, entry.path);
      select([]);
      animateTo(entry.camera);
    },
    [registry, atoms.history, atoms.path, select, animateTo],
  );

  // Auto drill: a portal filling the viewport becomes the root; a root shrunk to a corner yields to its parent.
  useEffect(() => {
    if (cancelRef.current || drag || viewport.width === 0) {
      return;
    }
    const timer = setTimeout(() => {
      const portal = Object.values(scene.cells).find(
        (cell): cell is PlacedCell =>
          cell.kind === 'scene' && coverage(camera, cellBounds(cell), viewport) >= AUTO_ENTER,
      );
      if (portal) {
        drillIn(portal, false);
      } else if (path.length > 1 && coverage(camera, bounds, viewport) < AUTO_EXIT) {
        drillOut(1, false);
      }
    }, AUTO_DRILL_MS);
    return () => clearTimeout(timer);
  }, [camera, scene, bounds, path.length, viewport, drag, drillIn, drillOut]);

  //
  // Pointer state machine.
  //

  const snap = useCallback(
    (value: number) => (snapEnabled ? Math.round(value / grid) * grid : value),
    [snapEnabled, grid],
  );
  const toggleSnap = useCallback(() => registry.set(atoms.snap, !registry.get(atoms.snap)), [registry, atoms.snap]);
  const toScene = useCallback(
    (event: { clientX: number; clientY: number }): Point => {
      const rect = rootRef.current?.getBoundingClientRect();
      const camera = registry.get(atoms.camera);
      return screenToScene(camera, { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) });
    },
    [registry, atoms.camera],
  );

  const setDrag = useCallback((next: Drag | undefined) => registry.set(atoms.drag, next), [registry, atoms.drag]);
  const setTool = useCallback((next: Tool) => registry.set(atoms.tool, next), [registry, atoms.tool]);

  const startDrag = useCallback(
    (next: Drag, event: React.PointerEvent) => {
      interactedRef.current = true;
      cancelAnimation();
      setDrag(next);
      rootRef.current?.setPointerCapture(event.pointerId);
    },
    [cancelAnimation, setDrag],
  );

  const onBackgroundPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      const currentTool = registry.get(atoms.tool);
      const point = toScene(event);
      if (event.button === 1 || currentTool === 'hand') {
        startDrag({ kind: 'pan', last: { x: event.clientX, y: event.clientY } }, event);
      } else if (event.button !== 0) {
        return;
      } else if (currentTool === 'select') {
        if (!event.shiftKey) {
          select([]);
        }
        startDrag({ kind: 'marquee', from: point, to: point, additive: event.shiftKey }, event);
      } else if (currentTool === 'rect' || currentTool === 'text' || currentTool === 'scene') {
        if (capabilities.create) {
          const from = { x: snap(point.x), y: snap(point.y) };
          startDrag({ kind: 'create', tool: currentTool, from, to: from }, event);
        }
      }
    },
    [registry, atoms.tool, toScene, startDrag, select, capabilities.create, snap],
  );

  const onCellPointerDown = useCallback(
    (cell: PlacedCell, event: React.PointerEvent) => {
      const currentTool = registry.get(atoms.tool);
      if (currentTool !== 'select' || event.button !== 0) {
        return;
      }
      event.stopPropagation();
      const current = registry.get(atoms.selection);
      const next = new Set(event.shiftKey ? current : current.has(cell.id) ? current : []);
      if (event.shiftKey && current.has(cell.id)) {
        next.delete(cell.id);
      } else {
        next.add(cell.id);
      }
      select(next);
      if (capabilities.move && !cell.locked) {
        startDrag({ kind: 'move', ids: [...next], origin: toScene(event), delta: { x: 0, y: 0 } }, event);
      }
    },
    [registry, atoms.tool, atoms.selection, select, capabilities.move, toScene, startDrag],
  );

  const onHandlePointerDown = useCallback(
    (cell: PlacedCell, handle: Handle, event: React.PointerEvent) => {
      if (event.button !== 0 || !capabilities.resize) {
        return;
      }
      event.stopPropagation();
      const start = cellBounds(cell);
      startDrag({ kind: 'resize', id: cell.id, handle, start, bounds: start }, event);
    },
    [capabilities.resize, startDrag],
  );

  const onPortPointerDown = useCallback(
    (cell: PlacedCell, port: Port, event: React.PointerEvent) => {
      if (event.button !== 0 || !capabilities.link) {
        return;
      }
      event.stopPropagation();
      const from = portPoint(cellBounds(cell), port);
      startDrag({ kind: 'link', source: { cell: cell.id, port: port.id }, from, to: from }, event);
    },
    [capabilities.link, startDrag],
  );

  /** The drop target for a link end: a port within reach pins it; a cell body leaves it automatic. */
  const linkTarget = useCallback(
    (point: Point, source: CellId): Endpoint | undefined => {
      const cell = hitTest(scene, point);
      if (!cell || cell.id === source) {
        return undefined;
      }
      const boundsOf = cellBounds(cell);
      const reach = PORT_SNAP_PX / registry.get(atoms.camera).zoom;
      const port = cellRegistry[cell.kind]
        .ports(cell)
        .find((candidate) => Math.hypot(...distance(portPoint(boundsOf, candidate), point)) <= reach);
      return port ? { cell: cell.id, port: port.id } : { cell: cell.id };
    },
    [scene, registry, atoms.camera, cellRegistry],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const current = registry.get(atoms.drag);
      if (!current) {
        return;
      }
      switch (current.kind) {
        case 'pan': {
          const zoom = registry.get(atoms.camera).zoom;
          setCamera((camera) =>
            panBy(camera, { x: (event.clientX - current.last.x) / zoom, y: (event.clientY - current.last.y) / zoom }),
          );
          setDrag({ ...current, last: { x: event.clientX, y: event.clientY } });
          break;
        }
        case 'marquee':
        case 'create': {
          const point = toScene(event);
          setDrag({ ...current, to: current.kind === 'create' ? { x: snap(point.x), y: snap(point.y) } : point });
          break;
        }
        case 'move': {
          const point = toScene(event);
          setDrag({
            ...current,
            delta: { x: snap(point.x - current.origin.x), y: snap(point.y - current.origin.y) },
          });
          break;
        }
        case 'resize': {
          const point = toScene(event);
          const anchor = handlePoint(current.start, current.handle);
          const delta = { x: snap(point.x - anchor.x), y: snap(point.y - anchor.y) };
          const cell = scene.cells[current.id];
          const minSize = (cell && isPlaced(cell) && cellRegistry[cell.kind].minSize) || { width: grid, height: grid };
          setDrag({ ...current, bounds: resizeBounds(current.start, current.handle, delta, minSize) });
          break;
        }
        case 'link': {
          const point = toScene(event);
          setDrag({ ...current, to: point, target: linkTarget(point, current.source.cell) });
          break;
        }
      }
    },
    [
      registry,
      atoms.drag,
      atoms.camera,
      setCamera,
      setDrag,
      toScene,
      snap,
      scene.cells,
      cellRegistry,
      grid,
      linkTarget,
    ],
  );

  const onPointerUp = useCallback(() => {
    const current = registry.get(atoms.drag);
    if (!current) {
      return;
    }
    setDrag(undefined);
    switch (current.kind) {
      case 'marquee': {
        const hits = cellsIntersecting(scene, boundsFromPoints(current.from, current.to)).map(({ id }) => id);
        select(current.additive ? [...registry.get(atoms.selection), ...hits] : hits);
        break;
      }
      case 'move': {
        if (current.delta.x !== 0 || current.delta.y !== 0) {
          projection.apply({ kind: 'move', ids: current.ids, delta: current.delta });
        }
        break;
      }
      case 'resize': {
        projection.apply({ kind: 'resize', id: current.id, bounds: current.bounds });
        break;
      }
      case 'link': {
        let target = current.target;
        if (!target && capabilities.create) {
          // Dropping on empty canvas creates a rect there and links to it (canvas-editor behaviour).
          const cell: Cell = {
            kind: 'rect',
            id: createId('rect'),
            z: topZ(Object.values(scene.cells)),
            center: { x: snap(current.to.x), y: snap(current.to.y) },
            size: DEFAULT_CELL,
          };
          projection.apply({ kind: 'create', cell });
          target = { cell: cell.id };
        }
        if (target) {
          projection.apply({ kind: 'link', id: createId('link'), source: current.source, target });
        }
        break;
      }
      case 'create': {
        const drawn = boundsFromPoints(current.from, current.to);
        const size =
          drawn.width < grid || drawn.height < grid
            ? DEFAULT_CELL
            : { width: Math.max(drawn.width, grid), height: Math.max(drawn.height, grid) };
        const center =
          drawn.width < grid || drawn.height < grid
            ? current.from
            : { x: drawn.x + drawn.width / 2, y: drawn.y + drawn.height / 2 };
        const id = createId(current.tool);
        const z = topZ(Object.values(scene.cells));
        const cell: Cell =
          current.tool === 'rect'
            ? { kind: 'rect', id, z, center, size, label: 'Untitled' }
            : current.tool === 'text'
              ? { kind: 'text', id, z, center, size, text: 'Text' }
              : { kind: 'scene', id, z, center, size, scene: createId('scene') };
        if (cell.kind === 'scene') {
          registry.set(store.scenes, {
            ...registry.get(store.scenes),
            [cell.scene]: { id: cell.scene, name: 'Untitled', cells: {} },
          });
        }
        projection.apply({ kind: 'create', cell });
        select([id]);
        setTool('select');
        break;
      }
      case 'pan':
        break;
    }
  }, [
    registry,
    atoms.drag,
    atoms.selection,
    setDrag,
    scene,
    select,
    projection,
    capabilities.create,
    snap,
    grid,
    store,
    setTool,
  ]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const selected = [...registry.get(atoms.selection)];
      if (event.key === 'Escape') {
        if (registry.get(atoms.drag)) {
          setDrag(undefined);
        } else if (selected.length > 0) {
          select([]);
        } else {
          drillOut();
        }
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected.length > 0 && capabilities.delete) {
        projection.apply({ kind: 'delete', ids: selected });
        select([]);
      } else if (event.key === 'Enter' && selected.length === 1) {
        const cell = scene.cells[selected[0]];
        if (cell && isPlaced(cell) && cellRegistry[cell.kind].openable) {
          drillIn(cell);
        }
      } else if (event.shiftKey && event.key === '!') {
        animateTo(fitBounds(bounds, viewport, FIT_INSET));
      } else if (event.shiftKey && event.key === '@' && selected.length > 0) {
        const union = unionBounds(
          selected
            .map((id) => scene.cells[id])
            .filter((cell): cell is PlacedCell => !!cell && isPlaced(cell))
            .map(cellBounds),
        );
        if (union) {
          animateTo(fitBounds(union, viewport, FIT_INSET));
        }
      } else if (event.shiftKey && event.key === ')') {
        animateTo(zoomAt(registry.get(atoms.camera), { x: viewport.width / 2, y: viewport.height / 2 }, 1));
      } else if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        goHistory(event.key === 'ArrowLeft' ? -1 : 1);
      } else if (event.key.startsWith('Arrow') && selected.length > 0 && capabilities.move) {
        const step = grid * (event.shiftKey ? 10 : 1);
        const delta = {
          x: event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          y: event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
        };
        projection.apply({ kind: 'move', ids: selected, delta });
        event.preventDefault();
      } else if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        select(
          Object.values(scene.cells)
            .filter(isPlaced)
            .map(({ id }) => id),
        );
        event.preventDefault();
      } else if (event.key === 'g' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        toggleSnap();
      } else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        const next = toolForKey(event.key);
        if (next) {
          setTool(next);
        }
      }
    },
    [
      registry,
      atoms.selection,
      atoms.drag,
      atoms.camera,
      setDrag,
      select,
      drillOut,
      drillIn,
      capabilities,
      projection,
      scene.cells,
      cellRegistry,
      animateTo,
      bounds,
      viewport,
      goHistory,
      grid,
      setTool,
      toggleSnap,
    ],
  );

  //
  // Render.
  //

  // Transient drag state is rendered by projecting it onto a copy, so links re-route while dragging.
  const displayScene = useMemo<Scene>(() => {
    if (drag?.kind === 'move') {
      return reduceIntent(scene, { kind: 'move', ids: drag.ids, delta: drag.delta });
    }
    if (drag?.kind === 'resize') {
      return reduceIntent(scene, { kind: 'resize', id: drag.id, bounds: drag.bounds });
    }
    return scene;
  }, [scene, drag]);

  const handlers = useMemo<CellHandlers>(
    () => ({
      onPointerDown: onCellPointerDown,
      onPointerEnter: (cell) => registry.set(atoms.hover, cell.id),
      onPointerLeave: () => registry.set(atoms.hover, undefined),
    }),
    [onCellPointerDown, registry, atoms.hover],
  );

  // Resolved at the root from the model: pointer capture during a drag retargets the click, so a
  // double-click never reaches the cell element itself.
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const cell = hitTest(scene, toScene(event));
      if (cell && cellRegistry[cell.kind].openable) {
        drillIn(cell);
      }
    },
    [scene, toScene, cellRegistry, drillIn],
  );

  const pointer = useMemo(
    () => screenToScene(camera, { x: viewport.width / 2, y: viewport.height / 2 }),
    [camera, viewport],
  );

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className={mx(
        'relative dx-fill overflow-hidden bg-base-surface outline-none touch-none select-none',
        tool === 'hand' && 'cursor-grab',
        (tool === 'rect' || tool === 'text' || tool === 'scene') && 'cursor-crosshair',
        classNames,
      )}
      style={{ contain: 'strict' }}
      data-testid='scene-view'
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    >
      {snapEnabled && (
        <GridComponent
          size={grid}
          scale={camera.zoom}
          offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
          showAxes={false}
        />
      )}
      <div
        className='absolute pointer-events-none'
        style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
      >
        <div
          className='absolute border border-dashed border-separator pointer-events-none'
          style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
        />
        <div className='pointer-events-auto'>
          <SceneLayer
            store={store}
            scene={displayScene}
            registry={cellRegistry}
            zoom={camera.zoom}
            depth={0}
            selected={selection}
            handlers={handlers}
          />
        </div>
        <ControlFrame
          scene={displayScene}
          registry={cellRegistry}
          selection={selection}
          hover={hover}
          zoom={camera.zoom}
          drag={drag}
          showPorts={tool === 'link'}
          onHandlePointerDown={onHandlePointerDown}
          onPortPointerDown={onPortPointerDown}
        />
      </div>

      <div className='absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded-sm bg-modal-surface border border-separator text-sm'>
        <Button variant='ghost' density='sm' disabled={path.length < 2} onClick={() => drillOut()}>
          Up
        </Button>
        <Breadcrumbs path={path} nameOf={nameOf} onSelect={(index) => drillOut(path.length - 1 - index)} />
        <Button variant='ghost' density='sm' onClick={() => animateTo(fitBounds(bounds, viewport, FIT_INSET))}>
          Fit
        </Button>
        <Button
          variant='ghost'
          density='sm'
          classNames={mx(snapEnabled && 'bg-primary-500/20')}
          title='Grid (G): show the grid and snap moves and resizes to it'
          onClick={toggleSnap}
        >
          Grid
        </Button>
        <span className='text-description font-mono'>
          {Math.round(camera.zoom * 100)}% · ({Math.round(pointer.x)}, {Math.round(pointer.y)}) · depth{' '}
          {path.length - 1}
        </span>
      </div>
      {showPalette && (
        <div className='absolute top-14 left-2'>
          <Palette tool={tool} onToolChange={setTool} />
        </div>
      )}
    </div>
  );
};

const distance = (left: Point, right: Point): [number, number] => [left.x - right.x, left.y - right.y];
