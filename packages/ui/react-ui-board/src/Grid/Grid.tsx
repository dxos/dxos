//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
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
import { type HasId, type GridLayout, type Size } from './types';

// TODO(burdon): Goal > Action > Result.
// TODO(burdon): Infinite canvas: hierarchical zoom.

// TODO(burdon): Data model.
// TODO(burdon): Drag cards.
// TODO(burdon): Plugin.
// TODO(burdon): Editors with concurrent AI tiles.
// TODO(burdon): Does scrollbar thin work?
// TODO(burdon): Drag to select.
// TODO(burdon): Key nav.
// TODO(burdon): Synthetic scrollbars.
// TODO(burdon): Prevent browser nav when scrolling to edge.

interface GridController {
  center: (id?: string) => void;
  toggleZoom: () => void;
}

type GridContextValue = {
  readonly: boolean;
  dimension: Size;
  size: Size;
  margin: number;
  grid: GridGeometry;
  zoom: boolean;
  controller: GridController;
};

const [GridContextProvider, useGridContext] = createContext<GridContextValue>('GridContext');

const defaultDimension = { width: 7, height: 5 };
const defaultGrid = { size: { width: 300, height: 300 }, gap: 16 };

//
// Root
//

type RootProps<T extends HasId = any> = PropsWithChildren<
  ThemedClassName<
    {
      items: T[];
      layout: GridLayout;
    } & Partial<Pick<GridContextValue, 'readonly' | 'dimension' | 'margin' | 'grid'>>
  >
>;

const RootInner = forwardRef<GridController, RootProps>(
  (
    { children, classNames, readonly, items, layout, dimension = defaultDimension, margin, grid = defaultGrid },
    forwardedRef,
  ) => {
    const { ref: containerRef, width, height } = useResizeDetector();
    const boardSize = useMemo<Size>(() => getGridBounds(dimension, grid), [dimension, grid]);

    const [visible, setVisible] = useState(false);
    const [zoom, setZoom] = useState(false);
    const [center, setCenter] = React.useState({ x: boardSize.width / 2, y: boardSize.height / 2 });
    const controller = useMemo<GridController>(
      () => ({
        center: (id) => {
          if (id) {
            const tile = layout.tiles[id];
            if (tile) {
              const rect = getGridRect(grid, tile);
              const center = getCenter(rect);
              setCenter({ x: boardSize.width / 2 + center.x, y: boardSize.height / 2 + center.y });
              setZoom(false);
            }
          } else {
            setCenter({ x: boardSize.width / 2, y: boardSize.height / 2 });
          }
        },
        toggleZoom: () => {
          setZoom((prev) => !prev);
        },
      }),
      [layout, grid, boardSize],
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
    }, [center, boardSize, width, height]);

    // Child components.
    const [inner, outer] = useMemo(() => {
      if (Array.isArray(children)) {
        const inner: ReactNode[] = [];
        const outer: ReactNode[] = [];
        children.forEach((child) => {
          switch (child.type) {
            case Controls:
              outer.push(child);
              break;
            case Background:
            default:
              inner.push(child);
              break;
          }
        });

        return [inner, outer];
      }

      return [];
    }, [children]);

    return (
      <GridContextProvider
        readonly={readonly ?? false}
        dimension={dimension}
        size={boardSize}
        margin={margin ?? 0}
        zoom={zoom}
        grid={grid}
        controller={controller}
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
          {outer}
          {/* Board container. */}
          <div
            className={mx('relative transition-transform duration-300 border border-separator', zoom && 'scale-50')}
            style={{
              width: boardSize.width,
              height: boardSize.height,
            }}
          >
            {/* Scrollable container. */}
            <div className={mx('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2')}>
              {inner}
              {items.map((item, index) => (
                <Tile
                  item={item}
                  key={index}
                  layout={layout.tiles[item.id] ?? { x: 0, y: 0 }}
                  onClick={() => controller.center(item.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </GridContextProvider>
    );
  },
);

const Root = <T extends HasId = any>(props: RootProps<T>) => <RootInner {...props} />;

Root.displayName = 'Grid.Root';

//
// Controls
//

type ControlsProps = ThemedClassName;

const Controls = ({ classNames }: ControlsProps) => {
  const { readonly, zoom, controller } = useGridContext('Controls');

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
  const { grid, dimension } = useGridContext('Background');

  const cells = useMemo(() => {
    const cells: Rect[] = [];
    for (let x = -Math.floor(dimension.width / 2); x <= Math.floor(dimension.width / 2); x++) {
      for (let y = -Math.floor(dimension.height / 2); y <= Math.floor(dimension.height / 2); y++) {
        cells.push(getGridRect(grid, { x, y }));
      }
    }

    return cells;
  }, [dimension, grid]);

  return (
    <div className='absolute inset-0 pointer-events-none'>
      {cells.map((rect, index) => (
        <div key={index} style={rect} className='absolute border border-dashed border-separator rounded opacity-50' />
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
  Controls,
  Background,
  Tile,
};

export type { RootProps as GridRootProps, TileProps as GridTileProps };

export { useGridContext };
