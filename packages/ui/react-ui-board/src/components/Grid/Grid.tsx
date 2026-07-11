//
// Copyright 2026 DXOS.org
//

import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
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
  /** Scroll viewport element; set by `Grid.Container`, used by the controller to center. */
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  /** Scroll the viewport so the grid is centered. */
  center: () => void;
  onAdd?: (position: GridItem) => void;
  onDelete?: (id: string) => void;
  onResize: (id: string, size: { w: number; h: number }, constraints?: GridConstraints) => void;
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

    // While one of this grid's tiles is dragged over a cell, compute where everything would settle
    // so the other tiles can animate out of the way (and spring back to `layout` when the drag ends).
    const previewLayout = useMemo<GridLayout | undefined>(() => {
      if (
        dragging &&
        dragging.source.data.containerId === containerId &&
        dragging.target?.data.type === 'placeholder'
      ) {
        const to = dragging.target.data.location;
        return moveItem(layout, dragging.source.data.id, to, mode);
      }
      return undefined;
    }, [dragging, containerId, layout, mode]);

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
        viewportRef={viewportRef}
        center={center}
        onAdd={readonly ? undefined : onAdd}
        onDelete={readonly ? undefined : onDelete}
        onResize={onResize}
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
    // scrollable when it overflows (unlike justify-center, which would clip the top/left).
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
  const { viewportRef, center } = useGridContext(GRID_CONTAINER_NAME);
  const localRef = useRef<HTMLDivElement>(null);
  const ref = composeRefs(localRef, viewportRef);

  // Auto-scroll attaches to the scrolling element (the ScrollArea viewport). `autoScrollForElements`
  // is global — it fires on any pragmatic-dnd drag, so it covers both tile moves and the resize drag.
  useEffect(() => {
    invariant(localRef.current);
    return autoScrollForElements({ element: localRef.current });
  }, []);

  // Center the grid once on mount only. Deliberately NOT re-centering when the layout/size changes,
  // so the viewport doesn't jump after a drag or resize (`center` is stable; runs a single time).
  useEffect(() => {
    center();
  }, [center]);

  return (
    <ScrollArea.Root orientation='all' classNames={classNames}>
      {/* `flex` so the viewport's `m-auto` centers the grid; overflow still scrolls both axes. */}
      <ScrollArea.Viewport ref={ref} classNames='flex'>
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

  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    invariant(ref.current);
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ type: 'placeholder', containerId, location: position }) satisfies DndPlaceholderData,
      // Only this grid's own tiles may be dropped here (same-container move; no cross-container yet).
      canDrop: ({ source }) => getSourceData(source)?.containerId === containerId,
      onDragEnter: () => {
        setActive(true);
      },
      onDragLeave: () => {
        setActive(false);
      },
      onDrop: () => {
        setActive(false);
      },
    });
  }, [containerId, position.x, position.y]);

  return (
    <div
      ref={ref}
      style={rect}
      className={mx(
        'group/cell absolute flex items-center justify-center border rounded-sm opacity-50',
        active ? 'border-transparent ring ring-accent-bg' : 'border-separator border-dashed',
      )}
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
