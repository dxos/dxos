//
// Copyright 2026 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentPropsWithoutRef,
  type MutableRefObject,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { invariant } from '@dxos/invariant';
import { IconButton, ScrollArea, type ThemedClassName, usePx, useTranslation } from '@dxos/react-ui';
import {
  type DndContainerHandler,
  type DndPlaceholderData,
  getSourceData,
  useContainerId,
  useDndRootContext,
} from '@dxos/react-ui-dnd';
import { cardDefaultInlineSize, mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { BoardCell, type BoardCellProps } from './BoardCell';
import {
  type Bounds,
  type DropResolver,
  type GridConstraints,
  type GridMode,
  type GridPosition,
  type Layout,
  pushToFit,
} from './engine';
import { type GridCellSize, type Rect, cellRect, getColumnCount, getRowCount, gridBounds } from './geometry';

// TODO(burdon): Multi-select + keyboard move/resize.
// TODO(burdon): Zoom/overview + toolbar (port from the previous Board — deferred).
// TODO(burdon): Pluggable coordinate origin (top-left vs centre) as a projection — deferred.

//
// Context
//

type BoardContextValue = {
  readonly: boolean;
  layout: Layout;
  mode: GridMode;
  /** Selection mode, or undefined when selection is disabled. */
  selectionMode?: SelectionMode;
  /** Currently selected tile ids (empty when nothing is selected / selection disabled). */
  selected: ReadonlySet<string>;
  /** Toggle a tile's selection on click; `additive` (shift-click, multi only) preserves the rest. */
  toggleSelection: (id: string, additive: boolean) => void;
  /** Scale factor in (0, 1]: 1 is actual size (draggable); below 1 is an overview (drag/resize off). */
  zoom: number;
  /** Smallest zoom the controls will step down to. */
  minZoom: number;
  /** Step the zoom in/out by `zoomStep`, clamped to [minZoom, 1]. */
  zoomIn: () => void;
  zoomOut: () => void;
  /** Cell size and gap in px (converted from the `cellSize`/`gap` props, which are in rem). */
  cellSize: GridCellSize;
  gap: number;
  /** Column/row extent to render (the backdrop shows at least this; grows with content). */
  columns: number;
  rows: number;
  /** When true, backdrop cells render their `x,y` coordinate (debugging aid). */
  debug: boolean;
  /** When true, the board is padded by half the viewport so any cell can be scrolled to the centre. */
  overscroll: boolean;
  /** Overscroll padding in px (half the viewport on each axis), or 0 when disabled. */
  overscrollPad: { x: number; y: number };
  containerId: string;
  /** During an active drag, the layout the board would settle into — tiles animate to these
   * positions and spring back to `layout` when the drag ends without a drop. Undefined when idle. */
  previewLayout?: Layout;
  /** True while a tile is being resized (a pointer drag, not a Dnd drag); gates the resize auto-scroll. */
  resizing: boolean;
  /** Scroll viewport element; set by `Board.Container`, used by the controller to center. */
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  /** Scroll the viewport to center the board, or a specific cell when its id is given. */
  center: (cell?: string) => void;
  onAdd?: (position: GridPosition) => void;
  onDelete?: (id: string) => void;
  onResize: (id: string, size: { w: number; h: number }, constraints?: GridConstraints) => void;
  /** Report an in-progress resize (snapped cells) so the engine runs live and other tiles move;
   * pass null on drop/cancel. */
  onResizePreview: (id: string, size: { w: number; h: number } | null) => void;
};

const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>('BoardContext');

/** Selection behaviour (mirrors `react-ui-list`'s `ListSelectionMode`). */
export type SelectionMode = 'single' | 'multi';

/**
 * Imperative handle exposed by `Board.Root` via ref.
 */
export type BoardController = {
  /** Scroll the viewport to center the board, or a specific cell when its id is given. */
  center: (cell?: string) => void;
};

//
// Root
// NOTE: Headless (renders no DOM); registers a single Dnd container handler for the whole board.
//

const BOARD_ROOT_NAME = 'Board.Root';

type BoardRootProps = PropsWithChildren<{
  layout: Layout;
  mode?: GridMode;
  /**
   * Board extent in cells: `columns` bounds the horizontal axis (clamp + right-push fallback);
   * `rows` is a minimum (the backdrop shows at least this, and the board grows past it). Omit
   * `columns` for a board whose width is derived from its content.
   */
  bounds?: Bounds;
  /**
   * Strategy applied when a tile is dropped or resized. Returns the resulting layout, or `null` to
   * reject (the tile springs back). Defaults to {@link pushToFit} (push occupants out of the way).
   */
  resolver?: DropResolver;
  /** Zoom scale in (0, 1] (controlled): 1 is actual size; below 1 is an overview (drag/resize off). */
  zoom?: number;
  /** Called by the zoom controls (`Board.Zoom`) with the next clamped scale. */
  onZoomChange?: (zoom: number) => void;
  /** Smallest scale the zoom controls step down to (default 0.25). */
  minZoom?: number;
  /** Zoom in/out step (default 0.25). */
  zoomStep?: number;
  /**
   * Enables tile selection: `single` keeps at most one selected; `multi` allows a set and enables
   * shift-click to add/remove. Undefined disables selection (clicks do nothing).
   */
  selectionMode?: SelectionMode;
  /** Controlled set of selected tile ids. */
  selected?: ReadonlySet<string>;
  /** Uncontrolled initial selection. */
  defaultSelected?: ReadonlySet<string>;
  onSelectedChange?: (selected: ReadonlySet<string>) => void;
  /** Cell size in rem. */
  cellSize?: GridCellSize;
  /** Gap between cells in rem. */
  gap?: number;
  /** Render each backdrop cell's `x,y` coordinate (debugging aid). Off by default. */
  debug?: boolean;
  /**
   * Pads the scrollable area by half the viewport on each side so any cell — including the corners —
   * can be scrolled to the centre of the viewport. Off by default.
   */
  overscroll?: boolean;
  /**
   * Milliseconds the drag must dwell on a target cell before the resolver runs against it. While
   * sweeping across cells faster than this, the other tiles stay put — so a tile can be dragged
   * over/past existing ones and only displaces them once the drag settles. 0 = immediate.
   */
  settleDelay?: number;
  readonly?: boolean;
  onChange?: (layout: Layout) => void;
  onAdd?: (position: GridPosition) => void;
  onDelete?: (id: string) => void;
}>;

// Default to a compact cell (~half a default card) so a board fits more tiles on screen; consumers
// can pass a larger `cellSize` for a card-sized board.
const defaultCellSize: GridCellSize = { width: cardDefaultInlineSize / 2, height: cardDefaultInlineSize / 2 };
const defaultGap = 1;

const BoardRoot = forwardRef<BoardController, BoardRootProps>(
  (
    {
      children,
      layout,
      mode = 'pack',
      bounds,
      resolver = pushToFit,
      zoom = 1,
      onZoomChange,
      minZoom = 0.25,
      zoomStep = 0.25,
      selectionMode,
      selected: selectedProp,
      defaultSelected,
      onSelectedChange,
      cellSize = defaultCellSize,
      gap = defaultGap,
      debug = false,
      overscroll = false,
      settleDelay = 500,
      readonly,
      onChange,
      onAdd,
      onDelete,
    },
    forwardedRef,
  ) => {
    const remInPx = usePx(1);
    const cellSizePx = useMemo<GridCellSize>(
      () => ({ width: cellSize.width * remInPx, height: cellSize.height * remInPx }),
      [remInPx, cellSize.width, cellSize.height],
    );
    const gapPx = gap * remInPx;
    // Rendered extent = at least the bounds, growing to fit content. A BOUNDED axis gets no growth
    // spare (so a tile at the last row/column sits flush in the corner); an UNBOUNDED axis adds a few
    // spare cells past the content for room to drag/add beyond it.
    const columns = useMemo(
      () => Math.max(getColumnCount(layout, bounds?.columns != null ? 0 : 2), bounds?.columns ?? 0),
      [layout, bounds?.columns],
    );
    const rows = useMemo(
      () => Math.max(getRowCount(layout, bounds?.rows != null ? 0 : 3), bounds?.rows ?? 0),
      [layout, bounds?.rows],
    );

    // Apply the resolver with the board's bounds/mode; returns the next layout or null (reject).
    const resolve = useCallback(
      (id: string, to: GridPosition, constraints?: GridConstraints): Layout | null =>
        resolver(layout, id, to, { bounds, constraints, mode }),
      [resolver, layout, bounds, mode],
    );

    const containerId = useContainerId('board');

    // Scroll viewport (set by Board.Container) + imperative centering, exposed via the Root ref.
    const viewportRef = useRef<HTMLDivElement | null>(null);

    // Overscroll padding: half the viewport on each side, measured from the scroll element so the
    // board can pad itself (see Board.Viewport) enough for any cell to reach the centre.
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    useEffect(() => {
      const el = viewportRef.current;
      if (!el || !overscroll) {
        setViewportSize({ width: 0, height: 0 });
        return;
      }
      const update = () => setViewportSize({ width: el.clientWidth, height: el.clientHeight });
      update();
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }, [overscroll]);
    const overscrollPad = useMemo(
      () => (overscroll ? { x: viewportSize.width / 2, y: viewportSize.height / 2 } : { x: 0, y: 0 }),
      [overscroll, viewportSize.width, viewportSize.height],
    );

    const center = useCallback(
      (cell?: string) => {
        const el = viewportRef.current;
        if (!el) {
          return;
        }
        // Anchor point in unscaled content coords (relative to the board box): a cell's centre, or the
        // whole board's centre.
        const position = cell ? layout.items[cell] : undefined;
        let anchorX: number;
        let anchorY: number;
        if (position) {
          const rect = cellRect(
            { x: position.x, y: position.y, w: position.w ?? 1, h: position.h ?? 1 },
            cellSizePx,
            gapPx,
          );
          anchorX = rect.left + rect.width / 2;
          anchorY = rect.top + rect.height / 2;
        } else {
          const board = gridBounds(columns, rows, cellSizePx, gapPx);
          anchorX = board.width / 2;
          anchorY = board.height / 2;
        }
        // The board box sits at the overscroll padding offset and scales from its top-left
        // (transform-origin 0 0), so a content point maps to `pad + point * zoom` on screen; place
        // the anchor at the viewport centre.
        const padX = overscroll ? el.clientWidth / 2 : 0;
        const padY = overscroll ? el.clientHeight / 2 : 0;
        el.scrollTo({
          left: padX + anchorX * zoom - el.clientWidth / 2,
          top: padY + anchorY * zoom - el.clientHeight / 2,
          behavior: 'smooth',
        });
      },
      [layout, cellSizePx, gapPx, columns, rows, zoom, overscroll],
    );
    useImperativeHandle(forwardedRef, () => ({ center }), [center]);

    // Zoom stepping (clamped to [minZoom, 1]); the scale is controlled by the consumer via onZoomChange.
    const zoomIn = useCallback(
      () => onZoomChange?.(Math.min(1, Math.round((zoom + zoomStep) * 100) / 100)),
      [onZoomChange, zoom, zoomStep],
    );
    const zoomOut = useCallback(
      () => onZoomChange?.(Math.max(minZoom, Math.round((zoom - zoomStep) * 100) / 100)),
      [onZoomChange, zoom, zoomStep, minZoom],
    );

    // Selection (hand-rolled controlled/uncontrolled; Radix useControllableState mishandles clearing).
    const emptySelection = useMemo<ReadonlySet<string>>(() => new Set(), []);
    const [uncontrolledSelected, setUncontrolledSelected] = useState<ReadonlySet<string>>(
      defaultSelected ?? emptySelection,
    );
    const selected = selectionMode ? (selectedProp ?? uncontrolledSelected) : emptySelection;
    const toggleSelection = useCallback(
      (id: string, additive: boolean) => {
        if (!selectionMode) {
          return;
        }
        let next: Set<string>;
        if (selectionMode === 'multi' && additive) {
          // Shift-click: add/remove this tile, keeping the rest of the set.
          next = new Set(selected);
          next.has(id) ? next.delete(id) : next.add(id);
        } else {
          // Plain click: select only this tile, or clear when it is already the sole selection.
          next = selected.size === 1 && selected.has(id) ? new Set() : new Set([id]);
        }
        if (selectedProp === undefined) {
          setUncontrolledSelected(next);
        }
        onSelectedChange?.(next);
      },
      [selectionMode, selected, selectedProp, onSelectedChange],
    );

    const onResize = useCallback(
      (id: string, size: { w: number; h: number }, constraints?: GridConstraints) => {
        const current = layout.items[id];
        if (!current) {
          return;
        }
        // Resize keeps x/y and applies the new span through the same resolver as a move.
        const next = resolve(id, { ...current, w: size.w, h: size.h }, constraints);
        if (next) {
          onChange?.(next);
        }
      },
      [layout, resolve, onChange],
    );

    // Register this board's container handler. Re-registers (by the stable `containerId` key) whenever
    // `resolve`/`onChange` change so `onDrop` always closes over the current layout.
    // NOTE: `addContainer`/`removeContainer` are re-created every `Dnd.Root` render; they are
    // intentionally left out of the deps below (mirroring `Mosaic.Container`) so this effect only
    // reruns when the board's own state changes, not on every drag frame.
    const { addContainer, removeContainer, dragging } = useDndRootContext(BOARD_ROOT_NAME);

    // In-progress resize (snapped cells), reported by the resizing cell; drives a live preview.
    const [resizePreview, setResizePreview] = useState<{ id: string; w: number; h: number } | null>(null);
    const onResizePreview = useCallback((id: string, size: { w: number; h: number } | null) => {
      setResizePreview(size ? { id, ...size } : null);
    }, []);

    // The cell the drag is currently over (this board's own tile, over a placeholder), or undefined.
    const dragTarget =
      dragging && dragging.source.data.containerId === containerId && dragging.target?.data.type === 'placeholder'
        ? dragging.target.data.location
        : undefined;

    // Debounce the drag target: only adopt it as the "settled" cell after the drag has dwelt on it for
    // `settleDelay` ms. Sweeping across cells faster than that keeps the last settled cell, so the
    // other tiles don't scatter while the tile passes over them (and it can reach the far side).
    const [settledTarget, setSettledTarget] = useState<{ x: number; y: number } | undefined>(undefined);
    useEffect(() => {
      if (!dragTarget || settleDelay <= 0) {
        setSettledTarget(dragTarget);
        return;
      }
      const timer = setTimeout(() => setSettledTarget(dragTarget), settleDelay);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragTarget?.x, dragTarget?.y, settleDelay]);

    // The layout the board would settle into during an in-progress move or resize, so the other tiles
    // animate out of the way (and spring back to `layout` when the gesture ends). Resize takes
    // precedence (it isn't a Dnd drag, so `dragging` is unset during it); the move uses the settled
    // (debounced) target so pushes only happen once the drag pauses on a cell.
    const previewLayout = useMemo<Layout | undefined>(() => {
      if (resizePreview) {
        const current = layout.items[resizePreview.id];
        return current
          ? (resolve(resizePreview.id, { ...current, w: resizePreview.w, h: resizePreview.h }) ?? undefined)
          : undefined;
      }
      if (dragging && dragging.source.data.containerId === containerId && settledTarget) {
        const id = dragging.source.data.id;
        const current = layout.items[id];
        return current ? (resolve(id, { ...current, x: settledTarget.x, y: settledTarget.y }) ?? undefined) : undefined;
      }
      return undefined;
    }, [resizePreview, dragging, containerId, settledTarget, layout, resolve]);

    useEffect(() => {
      const handler: DndContainerHandler = {
        id: containerId,
        canDrop: ({ source }) => source.containerId === containerId,
        onDrop: ({ source, target }) => {
          if (target?.type !== 'placeholder') {
            return;
          }
          const current = layout.items[source.id];
          if (!current) {
            return;
          }
          const next = resolve(source.id, { ...current, x: target.location.x, y: target.location.y });
          if (next) {
            onChange?.(next);
          }
        },
      };
      addContainer(handler);
      return () => removeContainer(containerId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId, resolve, onChange]);

    return (
      <BoardContextProvider
        readonly={readonly ?? false}
        layout={layout}
        mode={mode}
        selectionMode={selectionMode}
        selected={selected}
        toggleSelection={toggleSelection}
        zoom={zoom}
        minZoom={minZoom}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        cellSize={cellSizePx}
        gap={gapPx}
        columns={columns}
        rows={rows}
        debug={debug}
        overscroll={overscroll}
        overscrollPad={overscrollPad}
        containerId={containerId}
        previewLayout={previewLayout}
        resizing={!!resizePreview}
        viewportRef={viewportRef}
        center={center}
        onAdd={readonly ? undefined : onAdd}
        onDelete={readonly ? undefined : onDelete}
        onResize={onResize}
        onResizePreview={onResizePreview}
      >
        {children}
      </BoardContextProvider>
    );
  },
);

BoardRoot.displayName = BOARD_ROOT_NAME;

//
// Viewport
//

const BOARD_VIEWPORT_NAME = 'Board.Viewport';

type BoardViewportProps = ThemedClassName<PropsWithChildren>;

const BoardViewport = ({ classNames, children }: BoardViewportProps) => {
  const { cellSize, gap, columns, rows, zoom, overscrollPad } = useBoardContext(BOARD_VIEWPORT_NAME);
  const bounds = useMemo(() => gridBounds(columns, rows, cellSize, gap), [columns, rows, cellSize, gap]);
  const overscroll = overscrollPad.x > 0 || overscrollPad.y > 0;

  return (
    // `m-auto` centers the board within the (flex) scroll container when it fits, and stays fully
    // scrollable when it overflows (unlike justify-center, which would clip the top/left).
    // A zoom < 1 gives a scaled overview; drag/resize are disabled in that mode (see BoardCell).
    // With overscroll, an explicit margin (half the viewport) replaces `m-auto` so any cell can be
    // scrolled to the centre.
    <div
      // `shrink-0`: as a flex item the board must keep its full width, else the row container shrinks
      // it and the right-hand overflow (incl. the overscroll margin) collapses.
      data-dx-board-viewport='true'
      className={mx('relative m-auto shrink-0 transition-transform duration-300', classNames)}
      style={{
        width: bounds.width,
        height: bounds.height,
        // Scale from the top-left so a content point maps to `point * zoom` on screen; Board.Container
        // compensates scroll on zoom to keep the anchor (selected tile / current centre) fixed.
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: '0 0',
        margin: overscroll ? `${overscrollPad.y}px ${overscrollPad.x}px` : undefined,
      }}
    >
      {children}
    </div>
  );
};

BoardViewport.displayName = BOARD_VIEWPORT_NAME;

//
// Container
// NOTE: Scroll viewport; a custom edge auto-scroll fires while dragging/resizing near an edge.
//

const BOARD_CONTAINER_NAME = 'Board.Container';

type BoardContainerProps = ThemedClassName<PropsWithChildren>;

const BoardContainer = ({ classNames, children }: BoardContainerProps) => {
  const { viewportRef, center, resizing, zoom, selected, overscroll, layout, cellSize, gap } =
    useBoardContext(BOARD_CONTAINER_NAME);
  const localRef = useRef<HTMLDivElement>(null);
  const ref = composeRefs(localRef, viewportRef);

  // Read the live resizing flag from a ref so the mount-once auto-scroll effect always sees it.
  const resizingRef = useRef(resizing);
  resizingRef.current = resizing;

  // Latest state read from refs so the zoom-anchor effect depends only on `zoom` (so selecting a tile
  // at a constant zoom does NOT move the board).
  const anchorState = useRef({ selected, overscroll, layout, cellSize, gap });
  anchorState.current = { selected, overscroll, layout, cellSize, gap };

  // Keep the board anchored while zooming. The scale animates via CSS (transition-transform on
  // Board.Viewport); we read the LIVE scale each frame and set the scroll so the anchor stays at the
  // viewport centre for the whole animation (no post-animation shift). The anchor is the centre of
  // mass of the selected tiles, or — if nothing is selected — the current viewport centre held fixed.
  const prevZoomRef = useRef(zoom);
  const mountedRef = useRef(false);
  useEffect(() => {
    const element = localRef.current;
    const prevZoom = prevZoomRef.current;
    prevZoomRef.current = zoom;
    if (!element || !mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const { selected, overscroll, layout, cellSize, gap } = anchorState.current;
    const padX = overscroll ? element.clientWidth / 2 : 0;
    const padY = overscroll ? element.clientHeight / 2 : 0;

    // Anchor point in unscaled, board-relative content coords.
    let anchorX: number;
    let anchorY: number;
    const ids = [...selected].filter((id) => layout.items[id]);
    if (ids.length > 0) {
      // Centre of mass of the selected tiles' centres.
      let sumX = 0;
      let sumY = 0;
      for (const id of ids) {
        const position = layout.items[id];
        const rect = cellRect({ x: position.x, y: position.y, w: position.w ?? 1, h: position.h ?? 1 }, cellSize, gap);
        sumX += rect.left + rect.width / 2;
        sumY += rect.top + rect.height / 2;
      }
      anchorX = sumX / ids.length;
      anchorY = sumY / ids.length;
    } else {
      // Nothing selected: hold whatever is currently at the viewport centre.
      anchorX = (element.scrollLeft + element.clientWidth / 2 - padX) / prevZoom;
      anchorY = (element.scrollTop + element.clientHeight / 2 - padY) / prevZoom;
    }

    const board = element.querySelector<HTMLElement>('[data-dx-board-viewport]');
    const currentScale = (): number => {
      const transform = board && getComputedStyle(board).transform;
      if (!transform || transform === 'none') {
        return 1;
      }
      const matrix = transform.match(/matrix\(([^)]+)\)/);
      return matrix ? parseFloat(matrix[1].split(',')[0]) : 1;
    };

    let frame = 0;
    const sync = () => {
      const scale = currentScale();
      element.scrollLeft = padX + anchorX * scale - element.clientWidth / 2;
      element.scrollTop = padY + anchorY * scale - element.clientHeight / 2;
      // Keep syncing until the CSS transform settles on the target zoom.
      if (Math.abs(scale - zoom) > 0.001) {
        frame = requestAnimationFrame(sync);
      }
    };
    sync();
    return () => cancelAnimationFrame(frame);
  }, [zoom]);

  // Custom edge auto-scroll: engage only within a narrow edge band and ramp speed gently, so
  // scrolling starts near the edge (not early) and is smooth — pragmatic's `autoScrollForElements`
  // uses a large percentage-based hitbox at a fixed speed, with no public knob to soften either.
  // `dragover` drives it for tile moves (native HTML5 drag); `pointermove` (only while a resize is
  // active) drives it for the resize gesture. Both are gated so idle hover/scrollbar drags don't scroll.
  useEffect(() => {
    const element = localRef.current;
    invariant(element);

    const edge = 88;
    const maxSpeed = 8;
    let velocityX = 0;
    let velocityY = 0;
    let frame = 0;

    const stop = () => {
      velocityX = 0;
      velocityY = 0;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const tick = () => {
      if (!velocityX && !velocityY) {
        frame = 0;
        return;
      }
      element.scrollBy({ left: velocityX, top: velocityY });
      frame = requestAnimationFrame(tick);
    };
    // Ramp from 0 at the band's inner edge to maxSpeed at the very edge.
    const speed = (depth: number) => (Math.min(depth, edge) / edge) * maxSpeed;
    const track = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      velocityX =
        clientX < rect.left + edge
          ? -speed(rect.left + edge - clientX)
          : clientX > rect.right - edge
            ? speed(clientX - (rect.right - edge))
            : 0;
      velocityY =
        clientY < rect.top + edge
          ? -speed(rect.top + edge - clientY)
          : clientY > rect.bottom - edge
            ? speed(clientY - (rect.bottom - edge))
            : 0;
      if ((velocityX || velocityY) && !frame) {
        frame = requestAnimationFrame(tick);
      }
    };

    const onDragOver = (event: DragEvent) => {
      // Mark the drag as handled so the browser's own (fast, jumpy) native autoscroll stays off and
      // only this custom, ramped scroll runs — otherwise the two compound into large uncontrolled jumps.
      event.preventDefault();
      track(event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (resizingRef.current) {
        track(event.clientX, event.clientY);
      }
    };

    element.addEventListener('dragover', onDragOver);
    element.addEventListener('pointermove', onPointerMove);
    document.addEventListener('drop', stop);
    document.addEventListener('dragend', stop);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
    return () => {
      stop();
      element.removeEventListener('dragover', onDragOver);
      element.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('drop', stop);
      document.removeEventListener('dragend', stop);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
    };
  }, []);

  // Center the board once on mount only. Deliberately NOT re-centering when the layout/size changes,
  // so the viewport doesn't jump after a drag or resize (`center` now closes over `layout`, so it is
  // intentionally excluded from the deps — this must run a single time).
  useEffect(() => {
    center();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollArea.Root orientation='all' classNames={classNames}>
      {/* `flex` so the viewport's `m-auto` centers the board; overflow scrolls both axes. (Scroll-snap
          was removed: proximity snapping re-snapped the viewport after programmatic scrolls, fighting
          the zoom-anchor / auto-scroll compensation.) */}
      <ScrollArea.Viewport ref={ref} classNames='flex'>
        {children}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

BoardContainer.displayName = BOARD_CONTAINER_NAME;

//
// Content
//

const BOARD_CONTENT_NAME = 'Board.Content';

type BoardContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const BoardContent = ({ classNames, children, ...props }: BoardContentProps) => {
  return (
    <div className={mx('relative', classNames)} {...props}>
      {children}
    </div>
  );
};

BoardContent.displayName = BOARD_CONTENT_NAME;

//
// Backdrop
//

const BOARD_BACKDROP_NAME = 'Board.Backdrop';

type BoardBackdropProps = {};

const BoardBackdrop = (_props: BoardBackdropProps) => {
  const { cellSize, gap, columns, rows, debug, containerId, readonly, onAdd } = useBoardContext(BOARD_BACKDROP_NAME);

  const cells = useMemo(() => {
    const cells: { position: { x: number; y: number }; rect: Rect }[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        cells.push({ position: { x, y }, rect: cellRect({ x, y, w: 1, h: 1 }, cellSize, gap) });
      }
    }

    return cells;
  }, [columns, rows, cellSize, gap]);

  return (
    <div className='absolute inset-0'>
      {cells.map(({ position, rect }) => (
        <BoardDropTarget
          key={`${position.x}-${position.y}`}
          position={position}
          rect={rect}
          containerId={containerId}
          debug={debug}
          onAddClick={readonly ? undefined : () => onAdd?.({ x: position.x, y: position.y, w: 1, h: 1 })}
        />
      ))}
    </div>
  );
};

BoardBackdrop.displayName = BOARD_BACKDROP_NAME;

type BoardDropTargetProps = {
  position: { x: number; y: number };
  rect: Rect;
  containerId: string;
  debug?: boolean;
  onAddClick?: () => void;
};

const BoardDropTarget = ({ position, rect, containerId, debug, onAddClick }: BoardDropTargetProps) => {
  const { t } = useTranslation(translationKey);

  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    invariant(ref.current);
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ type: 'placeholder', containerId, location: position }) satisfies DndPlaceholderData,
      // Only this board's own tiles may be dropped here (same-container move; no cross-container yet).
      // The active-target highlight is drawn as the dragged tile's full footprint outline (see BoardCell),
      // so individual cells don't need their own ring.
      canDrop: ({ source }) => getSourceData(source)?.containerId === containerId,
    });
  }, [containerId, position.x, position.y]);

  return (
    <div
      ref={ref}
      style={rect}
      className='group/cell absolute flex items-center justify-center rounded-sm border border-dashed border-separator opacity-50'
    >
      {debug && (
        <span className='pointer-events-none select-none font-mono text-xs opacity-40 transition-opacity group-hover/cell:opacity-0'>
          {position.x},{position.y}
        </span>
      )}
      {onAddClick && (
        <IconButton
          icon='ph--plus--regular'
          iconOnly
          label={t('add-object.button')}
          classNames='absolute aspect-square opacity-0 transition-opacity duration-300 group-hover/cell:opacity-100'
          onClick={onAddClick}
        />
      )}
    </div>
  );
};

//
// Zoom
//

const BOARD_ZOOM_NAME = 'Board.Zoom';

type BoardZoomProps = ThemedClassName<{}>;

// A compact −/+ zoom control (reusing the shared IconButton). Stepping is clamped to [minZoom, 1].
const BoardZoom = ({ classNames }: BoardZoomProps) => {
  const { t } = useTranslation(translationKey);
  const { zoom, minZoom, zoomIn, zoomOut } = useBoardContext(BOARD_ZOOM_NAME);
  return (
    <div role='group' className={mx('flex items-center rounded-sm bg-modalSurface', classNames)}>
      <IconButton
        icon='ph--minus--regular'
        iconOnly
        label={t('zoom-out.button')}
        disabled={zoom <= minZoom}
        onClick={zoomOut}
      />
      <IconButton icon='ph--plus--regular' iconOnly label={t('zoom-in.button')} disabled={zoom >= 1} onClick={zoomIn} />
    </div>
  );
};

BoardZoom.displayName = BOARD_ZOOM_NAME;

//
// Map
// NOTE: A compact overview: every tile drawn as a proportional rect within the board's column/row extent.
//

const BOARD_MAP_NAME = 'Board.Map';

type BoardMapProps = ThemedClassName<{}>;

const BoardMap = ({ classNames }: BoardMapProps) => {
  const { layout, columns, rows, cellSize, gap, selected } = useBoardContext(BOARD_MAP_NAME);
  // Match the grid's pixel aspect (not the viewport's), and place tiles by their exact rects so the
  // map is a faithful scale model of the board.
  const bounds = useMemo(() => gridBounds(columns, rows, cellSize, gap), [columns, rows, cellSize, gap]);
  const tiles = useMemo(() => Object.entries(layout.items), [layout.items]);

  return (
    <div
      className={mx('relative overflow-hidden rounded-sm border border-separator bg-modalSurface', classNames)}
      style={{ aspectRatio: `${bounds.width} / ${bounds.height}` }}
    >
      {tiles.map(([id, position]) => {
        const rect = cellRect({ x: position.x, y: position.y, w: position.w ?? 1, h: position.h ?? 1 }, cellSize, gap);
        return (
          <div
            key={id}
            // Neutral fill (the separator token, matching the cell borders), accent only when selected.
            className={mx('absolute rounded-[1px]', selected.has(id) ? 'bg-accent-bg' : 'bg-separator')}
            style={{
              left: `${(rect.left / bounds.width) * 100}%`,
              top: `${(rect.top / bounds.height) * 100}%`,
              width: `${(rect.width / bounds.width) * 100}%`,
              height: `${(rect.height / bounds.height) * 100}%`,
            }}
          />
        );
      })}
    </div>
  );
};

BoardMap.displayName = BOARD_MAP_NAME;

//
// Board
//

export const Board = {
  Root: BoardRoot,
  Container: BoardContainer,
  Viewport: BoardViewport,
  Content: BoardContent,
  Backdrop: BoardBackdrop,
  Cell: BoardCell,
  Zoom: BoardZoom,
  Map: BoardMap,
};

export type {
  BoardBackdropProps,
  BoardCellProps,
  BoardContainerProps,
  BoardContentProps,
  BoardMapProps,
  BoardRootProps,
  BoardViewportProps,
  BoardZoomProps,
};

export { useBoardContext };
