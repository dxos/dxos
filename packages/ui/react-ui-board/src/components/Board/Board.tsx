//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { invariant } from '@dxos/invariant';
import {
  IconButton,
  type ThemedClassName,
  Toolbar,
  type ToolbarRootProps,
  usePx,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

import { BoardCell, type BoardCellProps } from './BoardCell';
import { defaultGrid, defaultLayout } from './defs';
import { type BoardGeometry, type Rect, getBoardBounds, getBoardRect, getCenter } from './geometry';
import { type BoardLayout, type Position, type Size } from './types';

// TODO(burdon): Infinite canvas: hierarchical zoom.
// TODO(burdon): Drag handles to resize.
// TODO(burdon): Synthetic scrollbars.
// TODO(burdon): Prevent browser nav when scrolling to edge.

interface BoardController {
  /** Center the board on the given cell or position. */
  center: (cell?: string | Position) => void;
  /** Toggle zoom mode. */
  toggleZoom: () => void;
}

//
// Context
//

type BoardContextValue = {
  readonly: boolean;
  layout: BoardLayout;
  grid: BoardGeometry;
  bounds: Size;
  center: Position;
  zoom: boolean;
  controller: BoardController;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, position: Position) => void;
  onAdd?: (anchor: HTMLButtonElement, position?: Position) => void;
};

const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>('BoardContext');

//
// Root
// NOTE: The Root is headless, which allows the Controls and Container to be in different subtrees.
//

type BoardRootProps = PropsWithChildren<
  Partial<Pick<BoardContextValue, 'readonly' | 'layout' | 'grid' | 'onSelect' | 'onDelete' | 'onMove' | 'onAdd'>>
>;

const BoardRoot = forwardRef<BoardController, BoardRootProps>(
  (
    { children, readonly, layout = defaultLayout, grid = defaultGrid, onSelect, onDelete, onMove, onAdd },
    forwardedRef,
  ) => {
    const remInPx = usePx(1);
    const gridInPx = useMemo(() => {
      console.log('[px update]', remInPx);
      return {
        size: { width: grid.size.width * remInPx, height: grid.size.height * remInPx },
        gap: grid.gap * remInPx,
        ...(grid?.overScroll && { overScroll: grid.overScroll * remInPx }),
      };
    }, [remInPx, grid]);
    const bounds = useMemo<Size>(() => getBoardBounds(layout.size, gridInPx), [layout, gridInPx]);

    const [zoom, setZoom] = useState(false);
    const [center, setCenter] = useState({ x: bounds.width / 2, y: bounds.height / 2 });

    // External controller.
    const controller = useMemo<BoardController>(
      () => ({
        center: (cell) => {
          if (cell) {
            const position = typeof cell === 'string' ? layout?.cells[cell] : cell;
            if (position) {
              const center = getCenter(getBoardRect(gridInPx, position));
              setCenter({ x: bounds.width / 2 + center.x, y: bounds.height / 2 + center.y });
              setZoom(false);
            }
          } else {
            setCenter({ x: bounds.width / 2, y: bounds.height / 2 });
          }
        },
        toggleZoom: () => {
          setZoom((prev) => !prev);
        },
      }),
      [layout, gridInPx, bounds],
    );
    useImperativeHandle(forwardedRef, () => controller, [controller]);

    const handleSelect = useCallback<NonNullable<BoardContextValue['onSelect']>>(
      (id) => {
        controller.center(id);
      },
      [controller],
    );

    return (
      <BoardContextProvider
        readonly={readonly ?? false}
        layout={layout}
        grid={gridInPx}
        bounds={bounds}
        center={center}
        zoom={zoom}
        controller={controller}
        onSelect={onSelect ?? handleSelect}
        onDelete={onDelete}
        onMove={onMove}
        onAdd={readonly ? undefined : onAdd}
      >
        {children}
      </BoardContextProvider>
    );
  },
);

BoardRoot.displayName = 'Board.Root';

//
// Container
//

type BoardContainerProps = ThemedClassName<PropsWithChildren>;

const BoardContainer = ({ classNames, children }: BoardContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeDetector({ targetRef: containerRef });
  const { bounds, grid, center } = useBoardContext(BoardContainer.displayName);

  const [mounted, setMounted] = useState(false);

  // Auto-center (on mount).
  useEffect(() => {
    const container = containerRef.current;
    if (container && width && height) {
      container.scrollTo({
        left: center.x - width / 2,
        top: center.y - height / 2,
        behavior: mounted ? 'smooth' : 'auto',
      });

      setMounted(true);
    }
  }, [center, bounds, width, height]);

  // Auto-scroll.
  useEffect(() => {
    invariant(containerRef.current);
    return autoScrollForElements({
      element: containerRef.current,
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={mx(
        'flex items-center justify-center overflow-auto scrollbar-none overscroll-x-contain',
        'opacity-0 transition-opacity duration-1000',
        mounted && 'opacity-100',
        classNames,
      )}
      style={{
        padding: grid.overScroll ?? 0,
      }}
    >
      {/* NOTE: This ensures that the children are centered if they are smaller than the container. */}
      <div className='max-bs-full max-is-full'>{children}</div>
    </div>
  );
};

BoardContainer.displayName = 'Board.Container';

//
// Viewport
//

type BoardViewportProps = ThemedClassName<PropsWithChildren>;

const BoardViewport = ({ classNames, children }: BoardViewportProps) => {
  const { bounds, zoom } = useBoardContext(BoardViewport.displayName);
  return (
    <div
      className={mx(
        'relative transition-transform duration-300 border border-separator rounded-lg',
        zoom && 'scale-50',
        classNames,
      )}
      style={{
        width: bounds.width,
        height: bounds.height,
      }}
    >
      {/* Scrollable container. */}
      <div className={mx('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2')}>{children}</div>
    </div>
  );
};

BoardViewport.displayName = 'Board.Viewport';

//
// Content
//

type BoardContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const BoardContent = ({ classNames, children, ...props }: BoardContentProps) => (
  <div role='none' className={mx(classNames)}>
    {children}
  </div>
);

BoardContent.displayName = 'Board.Content';

//
// Backdrop
//

type BoardBackdropProps = {};

const BoardBackdrop = (props: BoardBackdropProps) => {
  const { grid: board, layout, onAdd } = useBoardContext(BoardBackdrop.displayName);

  const cells = useMemo(() => {
    const cells: { position: Position; rect: Rect }[] = [];
    for (let x = -Math.floor(layout.size.width / 2); x <= Math.floor(layout.size.width / 2); x++) {
      for (let y = -Math.floor(layout.size.height / 2); y <= Math.floor(layout.size.height / 2); y++) {
        cells.push({ position: { x, y }, rect: getBoardRect(board, { x, y }) });
      }
    }

    return cells;
  }, [layout, board]);

  return (
    <div className='absolute inset-0'>
      {cells.map(({ position, rect }, index) => (
        <BoardDropTarget
          key={index}
          position={position}
          rect={rect}
          onAddClick={(event) => onAdd?.(event.currentTarget as HTMLButtonElement, position)}
        />
      ))}
    </div>
  );
};

BoardBackdrop.displayName = 'Board.Backdrop';

type BoardDropTargetProps = {
  position: Position;
  rect: Rect;
  onAddClick?: (event: MouseEvent) => void;
};

const BoardDropTarget = ({ position, rect, onAddClick }: BoardDropTargetProps) => {
  const { t } = useTranslation(translationKey);

  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    invariant(ref.current);
    return combine(
      dropTargetForElements({
        element: ref.current,
        getData: () => ({ position }),
        onDragEnter: () => {
          setActive(true);
        },
        onDragLeave: () => {
          setActive(false);
        },
        onDrop: () => {
          setActive(false);
        },
      }),
    );
  }, []);

  return (
    <div
      ref={ref}
      style={rect}
      className={mx(
        'group/cell absolute flex items-center justify-center border rounded opacity-50',
        active ? 'border-transparent ring ring-accentSurface' : 'border-separator border-dashed',
      )}
    >
      {onAddClick && (
        // TODO(burdon): Make this pluggable so that the container can provide a menu trigger.
        <IconButton
          icon='ph--plus--regular'
          iconOnly
          label={t('button add')}
          classNames='aspect-square opacity-0 transition-opacity duration-300 group-hover/cell:opacity-100'
          onClick={onAddClick}
        />
      )}
    </div>
  );
};

//
// Controls
//

type BoardToolbarProps = ThemedClassName<ToolbarRootProps>;

const BoardToolbar = (props: BoardToolbarProps) => {
  const { t } = useTranslation(translationKey);
  const { readonly, zoom, controller, onAdd } = useBoardContext(BoardToolbar.displayName);

  // TODO(burdon): Convert to MenuProvider.
  return (
    <Toolbar.Root {...props}>
      <Toolbar.IconButton
        icon='ph--crosshair--regular'
        iconOnly
        label={t('button center')}
        onClick={() => controller.center()}
      />
      <Toolbar.IconButton
        icon={zoom ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
        iconOnly
        label={t('button zoom')}
        onClick={() => controller.toggleZoom()}
      />
      {!readonly && onAdd && (
        <Toolbar.IconButton
          icon='ph--plus--regular'
          iconOnly
          label={t('button add')}
          onClick={(event) => onAdd?.(event.currentTarget as HTMLButtonElement)}
        />
      )}
    </Toolbar.Root>
  );
};

BoardToolbar.displayName = 'Board.Controls';

//
// Board
//

export const Board = {
  Root: BoardRoot,
  Container: BoardContainer,
  Viewport: BoardViewport,
  Content: BoardContent,
  Backdrop: BoardBackdrop,
  Toolbar: BoardToolbar,
  Cell: BoardCell,
};

export type {
  BoardRootProps,
  BoardContainerProps,
  BoardViewportProps,
  BoardContentProps,
  BoardBackdropProps,
  BoardCellProps,
  BoardToolbarProps,
  BoardController,
};

export { useBoardContext };
