//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { useDroppable } from '@dnd-kit/core';
import React, { FC, createContext, useState, useContext, useMemo, useEffect, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useMediaQuery } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import {
  calculateCellWidth,
  createMatrix,
  Dimension,
  getBounds,
  getDimension,
  getPanelBounds,
  Position,
} from './layout';
import { MosaicContainerProps, MosaicDataItem, Mosaic, Path } from '../../mosaic';

//
// Context.
//

type GridContextType = {
  defaultCellBounds: Dimension;
  spacing?: number;
};

const defaultGrid: GridContextType = {
  defaultCellBounds: { width: 280, height: 280 },
  spacing: 8,
};

// TODO(burdon): Context isn't used and could be removed.
const GridContext = createContext<GridContextType>(defaultGrid);

const useGrid = () => {
  return useContext(GridContext);
};

//
// Container.
//

export type GridLayout = { [id: string]: Position };

export type GridProps<TData extends MosaicDataItem = MosaicDataItem> = MosaicContainerProps<TData, Position> & {
  items?: TData[];
  layout?: GridLayout;
  size?: { x: number; y: number };
  center?: Position;
  margin?: boolean;
  square?: boolean;
  debug?: boolean;

  // TODO(burdon): Generalize (and pass item).
  onSelect?: (id: string) => void;
};

/**
 * Grid content.
 */
// TODO(burdon): Make generic (and forwardRef).
export const Grid = ({
  id,
  items = [],
  layout = {},
  size = { x: 8, y: 8 },
  margin,
  square = true,
  debug,
  Component = Mosaic.DefaultComponent,
  className,
  onDrop,
  onSelect,
}: GridProps) => {
  const { defaultCellBounds, spacing } = useGrid(); // TODO(burdon): Remove.
  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });
  const { matrix, bounds, cellBounds } = useMemo(() => {
    // Change default cell bounds to screen width if mobile.
    const cellWidth = calculateCellWidth(defaultCellBounds.width, width ?? 0);
    const cellBounds = {
      width: cellWidth,
      height: square ? cellWidth : defaultCellBounds.height,
    };

    return {
      matrix: createMatrix(size.x, size.y, ({ x, y }) => ({ x, y })),
      bounds: getPanelBounds(size, cellBounds, spacing),
      cellBounds,
    };
  }, [defaultCellBounds, size, width]);

  // No margin if mobile.
  const [isNotMobile] = useMediaQuery('md');
  const marginSize = margin && !isNotMobile ? Math.max(cellBounds.width, cellBounds.height) : 0;

  const setCenter = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (item && width && height) {
      const pos = getBounds(layout[item.id], cellBounds);
      const top = pos.top + marginSize - (height - cellBounds.height) / 2;
      const left = pos.left + marginSize - (width - cellBounds.width) / 2;
      containerRef.current!.scrollTo({ top, left, behavior: 'smooth' });
    }
  };

  const [selected, setSelected] = useState<string>();
  const handleSelect = (id: string) => {
    setSelected(id);
    setCenter(id);
    onSelect?.(id);
  };

  // TODO(burdon): Expose controlled selection.
  // TODO(burdon): Set center point on container (via translation?) Scale container to zoom.
  const contentRef = useRef<HTMLDivElement>(null);
  // const moveToCenter = () => {
  //   if (width && height && isNotMobile) {
  //     const center = {
  //       x: (contentRef.current!.offsetWidth + marginSize * 2 - width) / 2,
  //       y: (contentRef.current!.offsetHeight + marginSize * 2 - height) / 2,
  //     };
  //
  //     containerRef.current!.scrollTo({ top: center.y, left: center.x });
  //   }
  // };

  useEffect(() => {
    if (selected) {
      setCenter(selected);
    }
  }, [selected, width, height]);

  // TODO(burdon): Remove need for this by removing gaps around cells and instead including padding.
  const { setNodeRef } = useDroppable({ id, data: { path: id } });

  return (
    // TODO(burdon): Combine GridContext.Provider with MosaicContainer custom property (make generic).
    <Mosaic.Container
      {...{
        id,
        Component,
        getOverlayProps: () => ({ grow: true }),
        getOverlayStyle: () => getDimension(cellBounds, spacing),
        onOver: () => true,
        onDrop,
      }}
    >
      <GridContext.Provider value={defaultGrid}>
        <div ref={setNodeRef} className={mx('flex grow overflow-auto', className)}>
          <div
            ref={containerRef}
            className={mx('grow overflow-auto snap-x snap-mandatory md:snap-none bg-neutral-600')}
          >
            <div
              ref={contentRef}
              className='group block relative bg-neutral-500'
              style={{ ...bounds, margin: marginSize }}
            >
              <div>
                {matrix.map((row) =>
                  row.map(({ x, y }) => (
                    <GridCell
                      key={`${x}-${y}`}
                      path={id}
                      position={{ x, y }}
                      bounds={getBounds({ x, y }, cellBounds, spacing)}
                    />
                  )),
                )}
              </div>

              {/* TODO(burdon): Events: onDoubleClick={() => handleSelect(id)} */}
              <div>
                {items.map((item) => {
                  const position = layout[item.id] ?? { x: 0, y: 0 };
                  return (
                    <Mosaic.DraggableTile
                      key={item.id}
                      item={item}
                      path={id}
                      position={position}
                      Component={Component}
                      // debug={debug}
                      draggableStyle={{
                        position: 'absolute',
                        ...getBounds(position, cellBounds, spacing),
                      }}
                      onSelect={() => handleSelect(id)}
                    />
                  );
                })}
              </div>
            </div>

            {debug && <Mosaic.Debug data={{ items: items?.length }} position='bottom-right' />}
          </div>
        </div>
      </GridContext.Provider>
    </Mosaic.Container>
  );
};

/**
 * Grid cell.
 */
// TODO(burdon): Make Cell pluggable (e.g., to include create button).
const GridCell: FC<{ path: string; position: Position; bounds: Dimension }> = ({ path, position, bounds }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: Path.create(path, 'cell', `${position.x}-${position.y}`),
    data: { path, position },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ ...bounds }}
      className='absolute flex justify-center items-center grow select-none cursor-pointer'
    >
      <div
        // TODO(burdon): Show grid borders while dragging (or if grid is focused?)
        className={mx(
          'flex w-full h-full box-border border-dashed group-hover:border-4 border-neutral-600/50 rounded-lg',
          'transition ease-in-out duration-200 bg-neutral-500',
          isOver && 'bg-neutral-600',
        )}
      >
        <div className='font-mono text-sm text-red-700 hidden'>{JSON.stringify(position)}</div>
      </div>
    </div>
  );
};
