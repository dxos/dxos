//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { IconButton, Toolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Tile, type TileProps } from './Tile';
import { type GridGeometry, type Rect, getCenter, getGridBounds, getGridRect } from './geometry';
import { type HasId, type GridLayout, type Size, type Position } from './types';

// TODO(burdon): Goal > Action > Result.
// TODO(burdon): Infinite canvas: hierarchical zoom.

// TODO(burdon): Story with live objects.
// TODO(burdon): Drag cards.
// TODO(burdon): Center when has focus; key nav.
// TODO(burdon): Editors with concurrent AI tiles.
// TODO(burdon): Does scrollbar thin work?
// TODO(burdon): Drag to select/create.
// TODO(burdon): Drag handles to resize.
// TODO(burdon): Synthetic scrollbars.
// TODO(burdon): Prevent browser nav when scrolling to edge.
// TODO(burdon): Plugin.

const defaultDimension = { width: 7, height: 5 };
const defaultGrid = { size: { width: 300, height: 300 }, gap: 16 };

interface GridController {
  center: (id?: string) => void;
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
  margin: number;
  grid: GridGeometry;
  zoom: boolean;
  controller: GridController;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
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
        'layout' | 'readonly' | 'dimension' | 'margin' | 'grid' | 'onSelect' | 'onDelete' | 'onAdd'
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
      margin,
      grid = defaultGrid,
      onSelect,
      onDelete,
      onAdd,
    },
    forwardedRef,
  ) => {
    const { ref: containerRef, width, height } = useResizeDetector();
    const bounds = useMemo<Size>(() => getGridBounds(dimension, grid), [dimension, grid]);

    const [visible, setVisible] = useState(false);
    const [zoom, setZoom] = useState(false);
    const [center, setCenter] = useState({ x: bounds.width / 2, y: bounds.height / 2 });
    const controller = useMemo<GridController>(
      () => ({
        center: (id) => {
          if (id) {
            const tile = layout?.tiles[id];
            if (tile) {
              const rect = getGridRect(grid, tile);
              const center = getCenter(rect);
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

    useEffect(() => {
      const container = containerRef.current;
      if (container && width && height) {
        container.scrollTo({
          left: center.x - width / 2,
          top: center.y - height / 2,
          behavior: visible ? 'smooth' : 'auto',
        });

        setVisible(true);
      }
    }, [center, bounds, width, height]);

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
        margin={margin ?? 0}
        zoom={zoom}
        grid={grid}
        controller={controller}
        onSelect={onSelect ?? handleSelect}
        onDelete={onDelete}
        onAdd={readonly ? undefined : onAdd}
      >
        <div
          ref={containerRef}
          className={mx(
            'relative grid grow overflow-auto scrollbar-none opacity-0 transition-opacity duration-1000',
            visible && 'opacity-100',
            classNames,
          )}
          style={{
            padding: margin,
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

type ContentProps<T extends HasId = any> = ThemedClassName<
  PropsWithChildren<{
    items?: T[];
  }>
>;

const Content = <T extends HasId = any>({ classNames, children, items }: ContentProps<T>) => {
  const { layout, bounds, zoom } = useGridContext(Content.displayName);

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
          <Tile item={item} key={index} layout={layout?.tiles[item.id] ?? { x: 0, y: 0 }} />
        ))}
      </div>
    </div>
  );
};

Content.displayName = 'Grid.Content';

//
// Controls
//

type ControlsProps = ThemedClassName;

const Controls = ({ classNames }: ControlsProps) => {
  const { readonly, zoom, controller } = useGridContext(Controls.displayName);

  return (
    <div className={mx('fixed top-2 left-2 z-10', classNames)}>
      <Toolbar.Root>
        <IconButton
          icon='ph--crosshair--regular'
          size={5}
          iconOnly
          label='Center'
          onClick={() => controller.center()}
        />
        <IconButton
          icon={zoom ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
          size={5}
          iconOnly
          label='Zoom'
          onClick={() => controller.toggleZoom()}
        />
        {!readonly && <IconButton icon='ph--plus--regular' size={5} iconOnly label='Add' />}
      </Toolbar.Root>
    </div>
  );
};

Controls.displayName = 'Grid.Controls';

//
// Background
//

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
        <div
          key={index}
          style={rect}
          className='absolute group flex items-center justify-center border border-dashed border-separator rounded opacity-50'
        >
          {onAdd && (
            <IconButton
              icon='ph--plus--regular'
              size={5}
              iconOnly
              label='Add'
              classNames='aspect-square opacity-0 transition-opacity duration-300 group-hover:opacity-100'
              onClick={() => onAdd(position)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

Background.displayName = 'Grid.Background';

//
// Grid
//

export const Grid = {
  Root,
  Content,
  Controls,
  Background,
  Tile,
};

export type { RootProps as GridRootProps, ContentProps as GridContentProps, TileProps as GridTileProps };

export { useGridContext };
