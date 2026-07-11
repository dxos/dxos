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
  /** Overview mode: the board is scaled down and drag/resize are disabled. */
  zoom: boolean;
  /** Cell size and gap in px (converted from the `cellSize`/`gap` props, which are in rem). */
  cellSize: GridCellSize;
  gap: number;
  /** Column/row extent to render (the backdrop shows at least this; grows with content). */
  columns: number;
  rows: number;
  containerId: string;
  /** During an active drag, the layout the board would settle into — tiles animate to these
   * positions and spring back to `layout` when the drag ends without a drop. Undefined when idle. */
  previewLayout?: Layout;
  /** True while a tile is being resized (a pointer drag, not a Dnd drag); gates the resize auto-scroll. */
  resizing: boolean;
  /** Scroll viewport element; set by `Board.Container`, used by the controller to center. */
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  /** Scroll the viewport so the board is centered. */
  center: () => void;
  onAdd?: (position: GridPosition) => void;
  onDelete?: (id: string) => void;
  onResize: (id: string, size: { w: number; h: number }, constraints?: GridConstraints) => void;
  /** Report an in-progress resize (snapped cells) so the engine runs live and other tiles move;
   * pass null on drop/cancel. */
  onResizePreview: (id: string, size: { w: number; h: number } | null) => void;
};

const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>('BoardContext');

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
  /** Overview mode (controlled): scales the board down and disables drag/resize. */
  zoom?: boolean;
  /** Cell size in rem. */
  cellSize?: GridCellSize;
  /** Gap between cells in rem. */
  gap?: number;
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
      zoom = false,
      cellSize = defaultCellSize,
      gap = defaultGap,
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
    const columns = useMemo(() => bounds?.columns ?? getColumnCount(layout), [bounds?.columns, layout]);
    const rows = useMemo(() => Math.max(getRowCount(layout), bounds?.rows ?? 0), [layout, bounds?.rows]);

    // Apply the resolver with the board's bounds/mode; returns the next layout or null (reject).
    const resolve = useCallback(
      (id: string, to: GridPosition, constraints?: GridConstraints): Layout | null =>
        resolver(layout, id, to, { bounds, constraints, mode }),
      [resolver, layout, bounds, mode],
    );

    const containerId = useContainerId('board');

    // Scroll viewport (set by Board.Container) + imperative centering, exposed via the Root ref.
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const center = useCallback(
      (cell?: string) => {
        const el = viewportRef.current;
        if (!el) {
          return;
        }
        const position = cell ? layout.items[cell] : undefined;
        if (position) {
          // Center the viewport on the given cell's rect.
          const rect = cellRect(
            { x: position.x, y: position.y, w: position.w ?? 1, h: position.h ?? 1 },
            cellSizePx,
            gapPx,
          );
          el.scrollTo({
            left: rect.left + rect.width / 2 - el.clientWidth / 2,
            top: rect.top + rect.height / 2 - el.clientHeight / 2,
            behavior: 'smooth',
          });
        } else {
          el.scrollTo({ left: (el.scrollWidth - el.clientWidth) / 2, top: (el.scrollHeight - el.clientHeight) / 2 });
        }
      },
      [layout, cellSizePx, gapPx],
    );
    useImperativeHandle(forwardedRef, () => ({ center }), [center]);

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
        zoom={zoom}
        cellSize={cellSizePx}
        gap={gapPx}
        columns={columns}
        rows={rows}
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
  const { cellSize, gap, columns, rows, zoom } = useBoardContext(BOARD_VIEWPORT_NAME);
  const bounds = useMemo(() => gridBounds(columns, rows, cellSize, gap), [columns, rows, cellSize, gap]);

  return (
    // `m-auto` centers the board within the (flex) scroll container when it fits, and stays fully
    // scrollable when it overflows (unlike justify-center, which would clip the top/left). Scroll
    // snap points live on the backdrop cells (snap-to-grid), not here (see Board.Container / Backdrop).
    // `scale-50` (zoom) gives an overview; drag/resize are disabled in that mode (see BoardCell).
    <div
      className={mx('relative m-auto transition-transform duration-300', zoom && 'scale-50', classNames)}
      style={{ width: bounds.width, height: bounds.height }}
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
  const { viewportRef, center, resizing } = useBoardContext(BOARD_CONTAINER_NAME);
  const localRef = useRef<HTMLDivElement>(null);
  const ref = composeRefs(localRef, viewportRef);

  // Read the live resizing flag from a ref so the mount-once auto-scroll effect always sees it.
  const resizingRef = useRef(resizing);
  resizingRef.current = resizing;

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
      // Restore scroll-snap (removed while auto-scrolling — see tick) so manual scrolling snaps to grid.
      element.style.scrollSnapType = '';
    };
    const tick = () => {
      if (!velocityX && !velocityY) {
        frame = 0;
        return;
      }
      // Disable scroll-snap while auto-scrolling: with snap on, each incremental scrollBy re-snaps to
      // the next grid line and the viewport jumps a whole cell at a time instead of scrolling smoothly.
      element.style.scrollSnapType = 'none';
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
      {/* `flex` so the viewport's `m-auto` centers the board; overflow scrolls both axes. `snap-*`
          makes scrolling magnetically settle on the grid lines (snap points are the backdrop cells). */}
      <ScrollArea.Viewport ref={ref} classNames='flex snap-both snap-proximity'>
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
  const { cellSize, gap, columns, rows, containerId, readonly, onAdd } = useBoardContext(BOARD_BACKDROP_NAME);

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
  onAddClick?: () => void;
};

const BoardDropTarget = ({ position, rect, containerId, onAddClick }: BoardDropTargetProps) => {
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
      // `snap-start` aligns each cell's leading edge to the viewport, so scrolling snaps to the grid.
      className='group/cell absolute flex snap-start items-center justify-center rounded-sm border border-dashed border-separator opacity-50'
    >
      {onAddClick && (
        <IconButton
          icon='ph--plus--regular'
          iconOnly
          label={t('add-object.button')}
          classNames='aspect-square opacity-0 transition-opacity duration-300 group-hover/cell:opacity-100'
          onClick={onAddClick}
        />
      )}
    </div>
  );
};

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
};

export type {
  BoardBackdropProps,
  BoardCellProps,
  BoardContainerProps,
  BoardContentProps,
  BoardRootProps,
  BoardViewportProps,
};

export { useBoardContext };
