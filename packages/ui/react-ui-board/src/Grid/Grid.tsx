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
import { type GridGeometry, type Rect, getGridBounds, getGridRect } from './geometry';
import { type HasId, type GridLayout, type Size } from './types';

// TODO(burdon): Goal > Action > Result.
// TODO(burdon): Dashboard.
// TODO(burdon): Drag cards.
// TODO(burdon): Infinite canvas.
// TOOD(burdon): Transform center of grid.
// TODO(burdon): Editors with concurrent AI tiles.
// TODO(burdon): Connect cards to program agent. E.g., goals.
// TODO(burdon): Does scrollbar thin work?
// TODO(burdon): Prevent browser nav when scrolling to edge.
// TODO(burdon): Drag to select.
// TODO(burdon): Key nav.

interface GridController {
  center: () => void;
}

type GridContextValue = {
  readonly: boolean;
  dimension: Size;
  size: Size;
  margin: number;
  grid: GridGeometry;
  controller: GridController;
};

const [GridContextProvider, useGridContext] = createContext<GridContextValue>('GridContext');

//
// Root
//

type RootProps<T extends HasId = any> = PropsWithChildren<
  ThemedClassName<{
    readonly: boolean;
    items: T[];
    layout: GridLayout;
  }>
>;

const RootInner = forwardRef<GridController, RootProps>(
  ({ children, classNames, readonly, items, layout }, forwardedRef) => {
    const { ref: containerRef, width, height } = useResizeDetector();

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

    const margin = useMemo(() => 0, []);
    const grid = useMemo<GridContextValue['grid']>(() => ({ size: { width: 300, height: 300 }, gap: 16 }), []);
    const dimension = useMemo<Size>(() => ({ width: 7, height: 5 }), []);
    const size = useMemo<Size>(() => getGridBounds(dimension, grid), [dimension, grid]);

    const [center, setCenter] = React.useState({ x: size.width / 2, y: size.height / 2 });
    const [visible, setVisible] = useState(false);
    const controller = useMemo<GridController>(
      () => ({ center: () => setCenter({ x: size.width / 2, y: size.height / 2 }) }),
      [size],
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
    }, [center, size, width, height]);

    return (
      <GridContextProvider
        readonly={readonly}
        dimension={dimension}
        size={size}
        margin={margin}
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
          <div
            className='relative border border-separator'
            style={{
              width: size.width,
              height: size.height,
            }}
          >
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              {inner}
              {items.map((item, index) => (
                <Tile item={item} key={index} layout={layout.tiles[item.id] ?? { x: 0, y: 0 }} />
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
  const { readonly, controller } = useGridContext('Controls');

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
