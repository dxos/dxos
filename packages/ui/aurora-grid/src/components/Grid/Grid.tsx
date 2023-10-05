//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import React, { FC, createContext, useState, useContext, useMemo, useEffect, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useMediaQuery } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { calculateCellWidth, createMatrix, getBounds, getDimension, getPanelBounds, Position } from './layout';
import {
  Dimension,
  MosaicContainerProps,
  MosaicDataItem,
  MosaicDraggedItem,
  MosaicTileComponent,
  MosaicContainer,
  useContainer,
  DefaultComponent,
  getTransformCSS,
  Path,
} from '../../dnd';
import { Debug } from '../Debug';

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

type GridLayout = { [id: string]: Position };

type GridRootProps = MosaicContainerProps<any, Position> & {
  items?: MosaicDataItem[];
  layout?: GridLayout;
  size?: { x: number; y: number };
  center?: Position;
  margin?: boolean;
  square?: boolean;

  // TODO(burdon): Generalize (and pass item).
  onSelect?: (id: string) => void;
};

/**
 * Grid content.
 */
// TODO(burdon): Make generic (and forwardRef).
const GridRoot = ({
  id,
  items = [],
  layout = {},
  size = { x: 8, y: 8 },
  margin,
  square = true,
  debug,
  Component = DefaultComponent,
  className,
  onDrop,
  onSelect,
}: GridRootProps) => {
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

  const { setNodeRef } = useDroppable({ id });

  return (
    // TODO(burdon): Combine GridContext.Provider with MosaicContainer custom property (make generic).
    <MosaicContainer
      container={{
        id,
        Component,
        isDroppable: () => true,
        getOverlayStyle: () => getDimension(cellBounds, spacing),
        getOverlayProps: () => ({ grow: true }),
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
                      container={id}
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
                    <GridTile
                      key={item.id}
                      item={item}
                      container={id}
                      Component={Component}
                      position={position}
                      bounds={getBounds(position, cellBounds, spacing)}
                      onSelect={() => handleSelect(id)}
                    />
                  );
                })}
              </div>
            </div>

            {debug && <Debug data={{ items: items?.length }} position='bottom-right' />}
          </div>
        </div>
      </GridContext.Provider>
    </MosaicContainer>
  );
};

const GridTile: FC<{
  container: string;
  item: MosaicDataItem;
  Component: MosaicTileComponent<any>;
  position: Position;
  bounds: Dimension;
  onSelect: () => void;
}> = ({ container, item, Component, position, bounds, onSelect }) => {
  const { debug } = useContainer();
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: item.id,
    data: { container, item, position } satisfies MosaicDraggedItem,
  });

  if (isDragging) {
    return null;
  }

  return (
    <Component
      ref={setNodeRef}
      data={item}
      container={container}
      position={position}
      isDragging={isDragging}
      draggableStyle={{
        position: 'absolute',
        zIndex: isDragging ? 100 : undefined, // TODO(burdon): Const.
        transform: getTransformCSS(transform),
        ...bounds,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      grow={true}
      debug={debug}
      onSelect={onSelect}
    />
  );
};

/**
 * Grid cell.
 */
// TODO(burdon): Make Cell pluggable (e.g., to include create button).
const GridCell: FC<{ container: string; position: Position; bounds: Dimension }> = ({
  container,
  position,
  bounds,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: Path.create(container, 'cell', `${position.x}-${position.y}`),
    data: { container, position },
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

export const Grid = {
  Root: GridRoot,
  Cell: GridCell,
};

export type { GridRootProps, GridLayout };
