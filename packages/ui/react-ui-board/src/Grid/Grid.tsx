//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { IconButton, Toolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Tile, type TileProps } from './Tile';
import { type GridGeometry, type Size, getGridBounds, getGridPosition } from './geometry';
import { type HasId, type GridLayout } from './types';

// TODO(burdon): Goal > Action > Result.
// TODO(burdon): Dashboard.
// TODO(burdon): Drag cards.
// TODO(burdon): Infinite canvas.
// TOOD(burdon): Transform center of grid.
// TODO(burdon): Editors with concurrent AI tiles.
// TODO(burdon): Connect cards to program agent. E.g., goals.
// TODO(burdon): Does scrollbar thin work?
// TODO(burdon): Prevent browser nav when scrolling to edge.

interface GridController {
  center: () => void;
}

type GridContextValue = {
  readonly: boolean;
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

    const margin = useMemo(() => 0, []);
    const grid = useMemo<GridContextValue['grid']>(() => ({ size: { width: 300, height: 300 }, gap: 20 }), []);
    const size = useMemo<Size>(() => getGridBounds({ width: 7, height: 5 }, grid), [grid]);

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
      <GridContextProvider readonly={readonly} size={size} margin={margin} grid={grid} controller={controller}>
        <div
          ref={containerRef}
          className={mx(
            'grid grow overflow-auto scrollbar-none opacity-0 transition-opacity duration-1000',
            visible ? 'opacity-100' : '',
            classNames,
          )}
          style={{
            padding: margin,
          }}
        >
          <div
            className='relative border border-separator'
            style={{
              width: size.width,
              height: size.height,
            }}
          >
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              {items.map((item, index) => (
                <Tile item={item} key={index} position={getGridPosition(layout, item.id, grid)} />
              ))}
            </div>
          </div>
        </div>
        {children}
      </GridContextProvider>
    );
  },
);

const Root = <T extends HasId = any>(props: RootProps<T>) => <RootInner {...props} />;

//
// Controls
//

type ControlsProps = ThemedClassName;

const Controls = ({ classNames }: ControlsProps) => {
  const { readonly, controller } = useGridContext('Controls');

  return (
    <div className={mx('fixed top-2 left-2', classNames)}>
      <Toolbar.Root>
        {!readonly && <IconButton icon='ph--plus--regular' size={5} iconOnly label='Add' />}
        <IconButton
          icon='ph--crosshair--regular'
          size={5}
          iconOnly
          label='Center'
          onClick={() => controller.center()}
        />
      </Toolbar.Root>
    </div>
  );
};

//
// Grid
//

export const Grid = {
  Root,
  Controls,
  Tile,
};

export type { RootProps as GridRootProps, TileProps as GridTileProps };

export { useGridContext };
