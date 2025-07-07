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
import { IconButton, Toolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Cell, type CellProps } from './Cell';
import { type GridGeometry, type Rect, getCenter, getGridBounds, getGridRect } from './geometry';
import { type HasId, type GridLayout, type Size, type Position } from './types';

// TODO(burdon): Goal > Action > Result.
// TODO(burdon): Infinite canvas: hierarchical zoom.

// TODO(burdon): Story with live objects.
// TODO(burdon): Drag cards.
// TODO(burdon): Center when has focus; key nav.
// TODO(burdon): Editors with concurrent AI cells.
// TODO(burdon): Does scrollbar thin work?
// TODO(burdon): Drag to select/create.
// TODO(burdon): Drag handles to resize.
// TODO(burdon): Synthetic scrollbars.
// TODO(burdon): Prevent browser nav when scrolling to edge.
// TODO(burdon): Plugin.

const defaultDimension = { width: 7, height: 5 };
const defaultGrid = { size: { width: 300, height: 300 }, gap: 16 };

interface GridController {
  center: (cell?: string | Position) => void;
  toggleZoom: () => void;
}

//
// Context
//

type GridContextValue = {
  layout?: GridLayout;
  readonly: boolean;
  dimension: Size;
  bounds: Size;
  overScroll: number;
  grid: GridGeometry;
  zoom: boolean;
  controller: GridController;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, position: Position) => void;
  onAdd?: (position: Position) => void;
};

const [GridContextProvider, useGridContext] = createContext<GridContextValue>('GridContext');

//
// Root
//

type RootProps = PropsWithChildren<
  ThemedClassName<
    Partial<
      Pick<
        GridContextValue,
        'layout' | 'readonly' | 'dimension' | 'overScroll' | 'grid' | 'onSelect' | 'onDelete' | 'onMove' | 'onAdd'
      >
    >
  >
>;

const Root = forwardRef<GridController, RootProps>(
  (
    {
      children,
      classNames,
      layout,
      readonly,
      dimension = defaultDimension,
      overScroll,
      grid = defaultGrid,
      onSelect,
      onDelete,
      onMove,
      onAdd,
    },
    forwardedRef,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height } = useResizeDetector({ targetRef: containerRef });
    const bounds = useMemo<Size>(() => getGridBounds(dimension, grid), [dimension, grid]);

    const [mounted, setMounted] = useState(false);
    const [zoom, setZoom] = useState(false);
    const [center, setCenter] = useState({ x: bounds.width / 2, y: bounds.height / 2 });

    // External controller.
    const controller = useMemo<GridController>(
      () => ({
        center: (cell) => {
          if (cell) {
            const position = typeof cell === 'string' ? layout?.cells[cell] : cell;
            if (position) {
              const center = getCenter(getGridRect(grid, position));
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

    const handleSelect = useCallback<NonNullable<GridContextValue['onSelect']>>(
      (id) => {
        controller.center(id);
      },
      [controller],
    );

    return (
      <GridContextProvider
        layout={layout}
        readonly={readonly ?? false}
        dimension={dimension}
        bounds={bounds}
        overScroll={overScroll ?? 0}
        zoom={zoom}
        grid={grid}
        controller={controller}
        onSelect={onSelect ?? handleSelect}
        onDelete={onDelete}
        onMove={onMove}
        onAdd={readonly ? undefined : onAdd}
      >
        <div
          ref={containerRef}
          className={mx(
            'relative grid grow overflow-auto scrollbar-none opacity-0 transition-opacity duration-1000',
            mounted && 'opacity-100',
            classNames,
          )}
          style={{
            padding: overScroll,
          }}
        >
          {children}
        </div>
      </GridContextProvider>
    );
  },
);

Root.displayName = 'Grid.Root';

//
// Content
//

type ViewportProps<T extends HasId = any> = ThemedClassName<
  PropsWithChildren<{
    items?: T[];
  }>
>;

const Viewport = <T extends HasId = any>({ classNames, children, items }: ViewportProps<T>) => {
  const { layout, bounds, zoom } = useGridContext(Viewport.displayName);

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
      <div className={mx('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2')}>
        {children}
        {items?.map((item, index) => (
          <Cell item={item} key={index} layout={layout?.cells[item.id] ?? { x: 0, y: 0 }} />
        ))}
      </div>
    </div>
  );
};

Viewport.displayName = 'Grid.Viewport';

//
// Controls
//

type ControlsProps = ThemedClassName;

// TODO(burdon): Create variant that can be housed outside of provider?
const Controls = ({ classNames }: ControlsProps) => {
  const { readonly, zoom, controller } = useGridContext(Controls.displayName);

  return (
    <div className={mx('fixed top-4 left-4 z-10', classNames)}>
      <Toolbar.Root>
        <IconButton icon='ph--crosshair--regular' iconOnly label='Center' onClick={() => controller.center()} />
        <IconButton
          icon={zoom ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
          iconOnly
          label='Zoom'
          onClick={() => controller.toggleZoom()}
        />
        {!readonly && <IconButton icon='ph--plus--regular' iconOnly label='Add' />}
      </Toolbar.Root>
    </div>
  );
};

Controls.displayName = 'Grid.Controls';

//
// Background
//

type BackgroundProps = {};

const Background = () => {
  const { grid, dimension, onAdd } = useGridContext(Background.displayName);

  const cells = useMemo(() => {
    const cells: { position: Position; rect: Rect }[] = [];
    for (let x = -Math.floor(dimension.width / 2); x <= Math.floor(dimension.width / 2); x++) {
      for (let y = -Math.floor(dimension.height / 2); y <= Math.floor(dimension.height / 2); y++) {
        cells.push({ position: { x, y }, rect: getGridRect(grid, { x, y }) });
      }
    }

    return cells;
  }, [dimension, grid]);

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

Background.displayName = 'Grid.Background';

type CellDropTargetProps = {
  position: Position;
  rect: Rect;
  onClick?: () => void;
};

const CellDropTarget = ({ position, rect, onClick }: CellDropTargetProps) => {
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
          label='Add'
          classNames='aspect-square opacity-0 transition-opacity duration-300 group-hover:opacity-100'
          onClick={onClick}
        />
      )}
    </div>
  );
};

//
// Grid
//

export const Grid = {
  Root,
  Viewport,
  Controls,
  Background,
  Cell,
};

export type {
  RootProps as GridRootProps,
  ViewportProps as GridViewportProps,
  ControlsProps as GridControlsProps,
  BackgroundProps as GridBackgroundProps,
  CellProps as GridCellProps,
  GridController,
};

export { useGridContext };
