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

import { type GridConstraints, type GridItem, type GridLayout, type GridMode, moveItem, resizeItem } from './engine';
import { type GridCellSize, type Rect, cellRect, getRowCount, gridBounds } from './geometry';
import { GridCell, type GridCellProps } from './GridCell';

// TODO(burdon): Multi-select + keyboard move/resize.

//
// Context
//

type GridContextValue = {
  readonly: boolean;
  layout: GridLayout;
  mode: GridMode;
  /** Cell size and gap in px (converted from the `cellSize`/`gap` props, which are in rem). */
  cellSize: GridCellSize;
  gap: number;
  rows: number;
  containerId: string;
  /** During an active drag, the layout the grid would settle into — tiles animate to these
   * positions and spring back to `layout` when the drag ends without a drop. Undefined when idle. */
  previewLayout?: GridLayout;
  /** True while a tile is being resized (a pointer drag, not a Dnd drag); gates the resize auto-scroll. */
  resizing: boolean;
  /** Scroll viewport element; set by `Grid.Container`, used by the controller to center. */
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  /** Scroll the viewport so the grid is centered. */
  center: () => void;
  onAdd?: (position: GridItem) => void;
  onDelete?: (id: string) => void;
  onResize: (id: string, size: { w: number; h: number }, constraints?: GridConstraints) => void;
  /** Report an in-progress resize (snapped cells) so the engine runs live and other tiles move;
   * pass null on drop/cancel. */
  onResizePreview: (id: string, size: { w: number; h: number } | null) => void;
};

const [GridContextProvider, useGridContext] = createContext<GridContextValue>('GridContext');

/**
 * Imperative handle exposed by `Grid.Root` via ref.
 */
export type GridController = {
  /** Scroll the viewport so the grid content is centered. */
  center: () => void;
};

//
// Root
// NOTE: Headless (renders no DOM); registers a single Dnd container handler for the whole grid.
//

const GRID_ROOT_NAME = 'Grid.Root';

type GridRootProps = PropsWithChildren<{
  layout: GridLayout;
  mode?: GridMode;
  /** Cell size in rem. */
  cellSize?: GridCellSize;
  /** Gap between cells in rem. */
  gap?: number;
  /** Minimum number of rows to render (the backdrop shows at least this many, even when sparse). */
  minRows?: number;
  readonly?: boolean;
  onChange?: (layout: GridLayout) => void;
  onAdd?: (position: GridItem) => void;
  onDelete?: (id: string) => void;
}>;

// Default to a compact cell (~half a default card) so a grid fits more tiles on screen; consumers
// can pass a larger `cellSize` for a card-sized grid.
const defaultCellSize: GridCellSize = { width: cardDefaultInlineSize / 2, height: cardDefaultInlineSize / 2 };
const defaultGap = 1;

const GridRoot = forwardRef<GridController, GridRootProps>(
  (
    {
      children,
      layout,
      mode = 'pack',
      cellSize = defaultCellSize,
      gap = defaultGap,
      minRows = 0,
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
    const rows = useMemo(() => Math.max(getRowCount(layout), minRows), [layout, minRows]);

    const containerId = useContainerId('grid');

    // Scroll viewport (set by Grid.Container) + imperative centering, exposed via the Root ref.
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const center = useCallback(() => {
      const el = viewportRef.current;
      if (el) {
        el.scrollTo({ left: (el.scrollWidth - el.clientWidth) / 2, top: (el.scrollHeight - el.clientHeight) / 2 });
      }
    }, []);
    useImperativeHandle(forwardedRef, () => ({ center }), [center]);

    const onResize = useMemo(
      () => (id: string, size: { w: number; h: number }, constraints?: GridConstraints) => {
        onChange?.(resizeItem(layout, id, size, constraints, mode));
      },
      [layout, mode, onChange],
    );

    // Register this grid's container handler. Re-registers (by the stable `containerId` key) whenever
    // `layout`/`mode`/`onChange` change so `onDrop` always closes over the current layout.
    // NOTE: `addContainer`/`removeContainer` are re-created every `Dnd.Root` render; they are
    // intentionally left out of the deps below (mirroring `Mosaic.Container`) so this effect only
    // reruns when the grid's own state changes, not on every drag frame.
    const { addContainer, removeContainer, dragging } = useDndRootContext(GRID_ROOT_NAME);

    // In-progress resize (snapped cells), reported by the resizing cell; drives a live preview.
    const [resizePreview, setResizePreview] = useState<{ id: string; w: number; h: number } | null>(null);
    const onResizePreview = useCallback((id: string, size: { w: number; h: number } | null) => {
      setResizePreview(size ? { id, ...size } : null);
    }, []);

    // The layout the grid would settle into during an in-progress move or resize, so the other tiles
    // animate out of the way live (and spring back to `layout` when the gesture ends). Resize takes
    // precedence (it isn't a Dnd drag, so `dragging` is unset during it).
    const previewLayout = useMemo<GridLayout | undefined>(() => {
      if (resizePreview) {
        return resizeItem(layout, resizePreview.id, { w: resizePreview.w, h: resizePreview.h }, undefined, mode);
      }
      if (
        dragging &&
        dragging.source.data.containerId === containerId &&
        dragging.target?.data.type === 'placeholder'
      ) {
        const to = dragging.target.data.location;
        return moveItem(layout, dragging.source.data.id, to, mode);
      }
      return undefined;
    }, [resizePreview, dragging, containerId, layout, mode]);

    useEffect(() => {
      const handler: DndContainerHandler = {
        id: containerId,
        canDrop: ({ source }) => source.containerId === containerId,
        onDrop: ({ source, target }) => {
          if (target?.type !== 'placeholder') {
            return;
          }
          onChange?.(moveItem(layout, source.id, target.location, mode));
        },
      };
      addContainer(handler);
      return () => removeContainer(containerId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId, layout, mode, onChange]);

    return (
      <GridContextProvider
        readonly={readonly ?? false}
        layout={layout}
        mode={mode}
        cellSize={cellSizePx}
        gap={gapPx}
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
      </GridContextProvider>
    );
  },
);

GridRoot.displayName = GRID_ROOT_NAME;

//
// Viewport
//

const GRID_VIEWPORT_NAME = 'Grid.Viewport';

type GridViewportProps = ThemedClassName<PropsWithChildren>;

const GridViewport = ({ classNames, children }: GridViewportProps) => {
  const { layout, cellSize, gap, rows } = useGridContext(GRID_VIEWPORT_NAME);
  const bounds = useMemo(() => gridBounds(layout.columns, rows, cellSize, gap), [layout.columns, rows, cellSize, gap]);

  return (
    // `m-auto` centers the grid within the (flex) scroll container when it fits, and stays fully
    // scrollable when it overflows (unlike justify-center, which would clip the top/left). Scroll
    // snap points live on the backdrop cells (snap-to-grid), not here (see Grid.Container / Backdrop).
    <div className={mx('relative m-auto', classNames)} style={{ width: bounds.width, height: bounds.height }}>
      {children}
    </div>
  );
};

GridViewport.displayName = GRID_VIEWPORT_NAME;

//
// Container
// NOTE: Scroll viewport; registers pragmatic-dnd auto-scroll so dragging/resizing near an edge scrolls.
//

const GRID_CONTAINER_NAME = 'Grid.Container';

type GridContainerProps = ThemedClassName<PropsWithChildren>;

const GridContainer = ({ classNames, children }: GridContainerProps) => {
  const { viewportRef, center, resizing } = useGridContext(GRID_CONTAINER_NAME);
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

    const edge = 56;
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

  // Center the grid once on mount only. Deliberately NOT re-centering when the layout/size changes,
  // so the viewport doesn't jump after a drag or resize (`center` is stable; runs a single time).
  useEffect(() => {
    center();
  }, [center]);

  return (
    <ScrollArea.Root orientation='all' classNames={classNames}>
      {/* `flex` so the viewport's `m-auto` centers the grid; overflow scrolls both axes. `snap-*`
          makes scrolling magnetically settle on the grid lines (snap points are the backdrop cells). */}
      <ScrollArea.Viewport ref={ref} classNames='flex snap-both snap-proximity'>
        {children}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

GridContainer.displayName = GRID_CONTAINER_NAME;

//
// Content
//

const GRID_CONTENT_NAME = 'Grid.Content';

type GridContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const GridContent = ({ classNames, children, ...props }: GridContentProps) => {
  return (
    <div className={mx('relative', classNames)} {...props}>
      {children}
    </div>
  );
};

GridContent.displayName = GRID_CONTENT_NAME;

//
// Backdrop
//

const GRID_BACKDROP_NAME = 'Grid.Backdrop';

type GridBackdropProps = {};

const GridBackdrop = (_props: GridBackdropProps) => {
  const { layout, cellSize, gap, rows, containerId, readonly, onAdd } = useGridContext(GRID_BACKDROP_NAME);

  const cells = useMemo(() => {
    const cells: { position: { x: number; y: number }; rect: Rect }[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < layout.columns; x++) {
        cells.push({ position: { x, y }, rect: cellRect({ x, y, w: 1, h: 1 }, cellSize, gap) });
      }
    }

    return cells;
  }, [layout.columns, rows, cellSize, gap]);

  return (
    <div className='absolute inset-0'>
      {cells.map(({ position, rect }) => (
        <GridDropTarget
          key={`${position.x}-${position.y}`}
          position={position}
          rect={rect}
          containerId={containerId}
          onAddClick={readonly ? undefined : () => onAdd?.({ id: '', x: position.x, y: position.y, w: 1, h: 1 })}
        />
      ))}
    </div>
  );
};

GridBackdrop.displayName = GRID_BACKDROP_NAME;

type GridDropTargetProps = {
  position: { x: number; y: number };
  rect: Rect;
  containerId: string;
  onAddClick?: () => void;
};

const GridDropTarget = ({ position, rect, containerId, onAddClick }: GridDropTargetProps) => {
  const { t } = useTranslation(translationKey);

  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    invariant(ref.current);
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ type: 'placeholder', containerId, location: position }) satisfies DndPlaceholderData,
      // Only this grid's own tiles may be dropped here (same-container move; no cross-container yet).
      // The active-target highlight is drawn as the dragged tile's full footprint outline (see GridCell),
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
// Grid
//

export const Grid = {
  Root: GridRoot,
  Container: GridContainer,
  Viewport: GridViewport,
  Content: GridContent,
  Backdrop: GridBackdrop,
  Cell: GridCell,
};

export type {
  GridBackdropProps,
  GridCellProps,
  GridContainerProps,
  GridContentProps,
  GridRootProps,
  GridViewportProps,
};

export { useGridContext };
