//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { createContext } from '@radix-ui/react-context';
import React, {
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
import { IconButton, Toolbar, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Cell, type CellProps } from './Cell';
import { type BoardGeometry as BoardGrid, type Rect, getCenter, getBoardBounds, getBoardRect } from './geometry';
import { type HasId, type BoardLayout, type Size, type Position } from './types';
import { translationKey } from '../../translations';

// TODO(burdon): Infinite canvas: hierarchical zoom.
// TODO(burdon): Drag cards.
// TODO(burdon): Center when has focus; key nav.
// TODO(burdon): Editors with concurrent AI cells.
// TODO(burdon): Drag to select/create.
// TODO(burdon): Drag handles to resize.
// TODO(burdon): Synthetic scrollbars.
// TODO(burdon): Prevent browser nav when scrolling to edge.
// TODO(burdon): Does scrollbar thin work?
// TODO(burdon): Increase width/height.

const defaultLayout: BoardLayout = { size: { width: 7, height: 5 }, cells: {} };
const defaultGrid: BoardGrid = { size: { width: 300, height: 300 }, gap: 16, overScroll: 40 };

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
  grid: BoardGrid;
  bounds: Size;
  zoom: boolean;
  controller: BoardController;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, position: Position) => void;
  onAdd?: (position?: Position) => void;
};

const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>('BoardContext');

//
// Root
//

type RootProps = PropsWithChildren<
  ThemedClassName<
    Partial<Pick<BoardContextValue, 'readonly' | 'layout' | 'grid' | 'onSelect' | 'onDelete' | 'onMove' | 'onAdd'>>
  >
>;

const Root = forwardRef<BoardController, RootProps>(
  (
    { children, classNames, readonly, layout = defaultLayout, grid = defaultGrid, onSelect, onDelete, onMove, onAdd },
    forwardedRef,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height } = useResizeDetector({ targetRef: containerRef });
    const bounds = useMemo<Size>(() => getBoardBounds(layout.size, grid), [layout, grid]);

    const [mounted, setMounted] = useState(false);
    const [zoom, setZoom] = useState(false);
    const [center, setCenter] = useState({ x: bounds.width / 2, y: bounds.height / 2 });

    // External controller.
    const controller = useMemo<BoardController>(
      () => ({
        center: (cell) => {
          if (cell) {
            const position = typeof cell === 'string' ? layout?.cells[cell] : cell;
            if (position) {
              const center = getCenter(getBoardRect(grid, position));
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
      [layout, grid, bounds],
    );
    useImperativeHandle(forwardedRef, () => controller, [controller]);

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
        grid={grid}
        bounds={bounds}
        zoom={zoom}
        controller={controller}
        onSelect={onSelect ?? handleSelect}
        onDelete={onDelete}
        onMove={onMove}
        onAdd={readonly ? undefined : onAdd}
      >
        <div
          ref={containerRef}
          className={mx(
            'relative board grow overflow-auto scrollbar-none opacity-0 transition-opacity duration-1000',
            mounted && 'opacity-100',
            classNames,
          )}
          style={{
            padding: grid.overScroll ?? 0,
          }}
        >
          {children}
        </div>
      </BoardContextProvider>
    );
  },
);

Root.displayName = 'Board.Root';

//
// Content
//

type ViewportProps = ThemedClassName<PropsWithChildren>;

const Viewport = ({ classNames, children }: ViewportProps) => {
  const { bounds, zoom } = useBoardContext(Viewport.displayName);
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

Viewport.displayName = 'Board.Viewport';

//
// Content
//

type ContentProps<T extends HasId = any> = {
  items?: T[];
} & Pick<CellProps, 'getTitle'>;

const Content = <T extends HasId = any>({ items, ...props }: ContentProps<T>) => {
  const { layout } = useBoardContext(Viewport.displayName);

  return (
    <div role='none'>
      {items?.map((item, index) => (
        <Cell item={item} key={index} layout={layout?.cells[item.id] ?? { x: 0, y: 0 }} {...props} />
      ))}
    </div>
  );
};

Content.displayName = 'Board.Content';

//
// Background
//

type BackgroundProps = {};

const Background = () => {
  const { grid: board, layout, onAdd } = useBoardContext(Background.displayName);

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
        <CellDropTarget
          key={index}
          position={position}
          rect={rect}
          // TODO(burdon): Menu.
          onClick={onAdd ? () => onAdd(position) : undefined}
        />
      ))}
    </div>
  );
};

Background.displayName = 'Board.Background';

type CellDropTargetProps = {
  position: Position;
  rect: Rect;
  onClick?: () => void;
};

const CellDropTarget = ({ position, rect, onClick }: CellDropTargetProps) => {
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
        'absolute group flex items-center justify-center border rounded opacity-50',
        active ? 'border-transparent ring ring-accentSurface' : 'border-separator border-dashed',
      )}
    >
      {onClick && (
        <IconButton
          icon='ph--plus--regular'
          size={5}
          iconOnly
          label={t('button add')}
          classNames='aspect-square opacity-0 transition-opacity duration-300 group-hover:opacity-100'
          onClick={onClick}
        />
      )}
    </div>
  );
};

//
// Controls
//

type ControlsProps = ThemedClassName;

// TODO(burdon): Translations.
// TODO(burdon): Create variant that can be housed outside of provider?
const Controls = ({ classNames }: ControlsProps) => {
  const { t } = useTranslation(translationKey);
  const { readonly, zoom, controller, onAdd } = useBoardContext(Controls.displayName);

  return (
    <div className={mx('fixed top-4 left-4 z-10', classNames)}>
      <Toolbar.Root>
        <IconButton
          icon='ph--crosshair--regular'
          iconOnly
          label={t('button center')}
          onClick={() => controller.center()}
        />
        <IconButton
          icon={zoom ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
          iconOnly
          label={t('button zoom')}
          onClick={() => controller.toggleZoom()}
        />
        {!readonly && onAdd && (
          <IconButton icon='ph--plus--regular' iconOnly label={t('button add')} onClick={() => onAdd()} />
        )}
      </Toolbar.Root>
    </div>
  );
};

Controls.displayName = 'Board.Controls';

//
// Board
//

export const Board = {
  Root,
  Viewport,
  Content,
  Background,
  Controls,
  Cell,
};

export type {
  RootProps as BoardRootProps,
  ViewportProps as BoardViewportProps,
  ContentProps as BoardContentProps,
  BackgroundProps as BoardBackgroundProps,
  ControlsProps as BoardControlsProps,
  CellProps as BoardCellProps,
  BoardController,
};

export { useBoardContext };
