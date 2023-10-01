//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { FC, createContext, useState, useContext, useMemo, useEffect, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useMediaQuery } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { Bounds, calculateCellWidth, createMatrix, getBounds, getPosition, Position } from './util';
import { MosaicDataItem, MosaicDraggedItem, MosaicTileComponent } from '../../dnd';

//
// Context.
//

type GridContextType = {
  defaultCellBounds: Bounds;
  spacing?: number;
};

const defaultGrid: GridContextType = {
  defaultCellBounds: { width: 280, height: 280 },
  spacing: 8,
};

const GridContext = createContext<GridContextType>(defaultGrid);

const useGrid = () => {
  return useContext(GridContext);
};

// TODO(burdon): Scale container.

type GridLayout = { [id: string]: Position };

type GridRootProps = {
  id: string;
  items: MosaicDataItem[];
  layout: GridLayout;
  Component: MosaicTileComponent<any>;
  size: { x: number; y: number };
  center?: Position;
  margin?: boolean;
  debug?: boolean;
};

/**
 * Root component.
 */
const GridRoot = ({ id, items, layout, Component, size = { x: 8, y: 8 }, margin }: GridRootProps) => {
  return (
    <GridContext.Provider value={defaultGrid}>
      <SortableContext id={id} items={items.map((item) => item.id)}>
        <GridLayout id={id} items={items} layout={layout} Component={Component} size={size} margin={margin} />
      </SortableContext>
    </GridContext.Provider>
  );
};

/**
 * Grid content.
 */
// TODO(burdon): Make generic?
const GridLayout: FC<{
  id: string;
  items: MosaicDataItem[];
  layout: GridLayout;
  Component: MosaicTileComponent<unknown>; // TODO(burdon): Name?
  size: { x: number; y: number };
  square?: boolean;
  margin?: boolean;
  onSelect?: (id: string) => void;
}> = ({ id, items, layout, Component, size, square = true, margin, onSelect }) => {
  // TODO(burdon): Performance is poor.
  // TODO(burdon): BUG: React has detected a change in the order of Hooks.
  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });
  const contentRef = useRef<HTMLDivElement>(null);

  const { defaultCellBounds, spacing } = useGrid();
  const { matrix, bounds, cellBounds } = useMemo(() => {
    // Change default cell bounds to screen width if mobile.
    const cellWidth = calculateCellWidth(defaultCellBounds.width, width ?? 0);
    const cellBounds = {
      width: cellWidth,
      height: square ? cellWidth : defaultCellBounds.height,
    };

    return {
      matrix: createMatrix(size.x, size.y, ({ x, y }) => ({ x, y })),
      bounds: { width: size.x * cellBounds.width, height: size.y * cellBounds.height },
      cellBounds,
    };
  }, [defaultCellBounds, size, width]);

  // No margin if mobile.
  const [isNotMobile] = useMediaQuery('md');
  const marginSize = margin && !isNotMobile ? Math.max(cellBounds.width, cellBounds.height) : 0;

  const setCenter = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (item && width && height) {
      const pos = getPosition(layout[item.id], cellBounds);
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

  useEffect(() => {
    if (selected) {
      // Center on selected.
      setCenter(selected);
    } else {
      // Center on screen.
      if (width && height && isNotMobile) {
        const center = {
          x: (contentRef.current!.offsetWidth + marginSize * 2 - width) / 2,
          y: (contentRef.current!.offsetHeight + marginSize * 2 - height) / 2,
        };

        containerRef.current!.scrollTo({ top: center.y, left: center.x });
      }
    }
  }, [selected, width, height]);

  // TODO(burdon): Set center point on container (via translation?)
  return (
    <div ref={containerRef} className='grow overflow-auto snap-x snap-mandatory md:snap-none bg-neutral-600'>
      <div ref={contentRef} className='group block relative bg-neutral-500' style={{ ...bounds, margin: marginSize }}>
        <div>
          {matrix.map((row) =>
            row.map(({ x, y }) => (
              <Cell key={`${x}-${y}`} position={{ x, y }} bounds={getBounds({ x, y }, cellBounds, spacing)} />
            )),
          )}
        </div>

        {/* TODO(burdon): onDoubleClick={() => handleSelect(id)} */}
        <div>
          {items.map((item) => {
            const position = layout[item.id] ?? { x: 0, y: 0 };
            return (
              <Tile
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
    </div>
  );
};

const Tile: FC<{
  container: string;
  item: MosaicDataItem;
  Component: MosaicTileComponent<unknown>;
  position: Position;
  bounds: Bounds;
  onSelect: () => void;
}> = ({ container, item, Component, position, bounds, onSelect }) => {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: item.id,
    data: { container, item, position } satisfies MosaicDraggedItem,
  });

  return (
    <Component
      ref={setNodeRef}
      id={item.id}
      data={item}
      isDragging={isDragging}
      draggableStyle={{
        position: 'absolute',
        zIndex: isDragging ? 100 : undefined, // TODO(burdon): Const.
        transform: transform ? CSS.Transform.toString(Object.assign(transform, { scaleY: 1 })) : undefined,
        ...bounds,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      onSelect={onSelect}
    />
  );
};

/**
 * Grid cell.
 */
const Cell: FC<{ position: Position; bounds: Bounds }> = ({ position, bounds }) => {
  // TODO(burdon): Local handler.
  // TODO(burdon): Global ids based on container.
  // TODO(burdon): Do we need to use the hook here? (Performance).
  const { setNodeRef, isOver } = useDroppable({ id: `grid-drop-${position.x}-${position.y}`, data: { position } });

  // TODO(burdon): Create button.
  return (
    <div
      ref={setNodeRef}
      style={{ ...bounds }}
      className='absolute flex justify-center items-center grow select-none cursor-pointer'
    >
      <div
        className={mx(
          'flex w-full h-full box-border border-dashed group-hover:border border-neutral-600 rounded',
          isOver && 'bg-neutral-600 border-neutral-700',
        )}
      >
        <div className='font-mono text-sm text-red-700 hidden'>{JSON.stringify(position)}</div>
      </div>
    </div>
  );
};

export const Grid = {
  Root: GridRoot,
};

export type { GridRootProps, GridLayout };
