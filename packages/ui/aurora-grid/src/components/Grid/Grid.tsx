//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, {
  FC,
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  useRef,
  RefAttributes,
  ForwardRefExoticComponent,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useMediaQuery } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

export type Bounds = { width: number; height: number };

export type Position = { x: number; y: number };

const createMatrix = <TValue,>(rangeX: number, rangeY: number, value: (position: Position) => TValue): TValue[][] => {
  const matrix: TValue[][] = [];
  for (let x = 0; x < rangeX; x++) {
    matrix.push(Array.from({ length: rangeY }, (_, y) => value({ x, y })));
  }

  return matrix;
};

// TODO(burdon): Set center point on container (via translation?)

const getPosition = ({ x, y }: Position, { width, height }: Bounds) => ({ left: x * width, top: y * height });

const getBounds = ({ x, y }: Position, { width, height }: Bounds, padding = 0) => ({
  left: x * width + padding,
  top: y * height + padding,
  width: width - padding * 2,
  height: height - padding * 2,
});

const getCellWidth = (
  defaultWidth: number,
  screenWidth: number,
  options: { min: number; max: number } = { min: 260, max: 400 },
) => {
  return screenWidth > options.min && screenWidth < options.max ? screenWidth : defaultWidth;
};

//
// Context.
//

type GridContextType = {
  defaultCellBounds: Bounds;
  spacing?: number;
};

const defaultGrid: GridContextType = {
  defaultCellBounds: { width: 300, height: 300 },
  spacing: 8,
};

const GridContext = createContext<GridContextType>(defaultGrid);

const useGrid = () => {
  return useContext(GridContext);
};

// TODO(burdon): Scale container.

/**
 * Root container.
 */
// TODO(burdon): Type.
const GridRoot: FC<{ items: GridItem<any>[]; size: { x: number; y: number }; center?: Position }> = ({
  items,
  size = { x: 8, y: 8 },
}) => {
  return (
    <GridContext.Provider value={defaultGrid}>
      <SortableContext items={items.map((item) => item.id)}>
        <GridLayout items={items} size={size} />
      </SortableContext>
    </GridContext.Provider>
  );
};

/**
 * Grid content.
 */
const GridLayout: FC<{
  items: GridItem<any>[];
  size: { x: number; y: number };
  square?: boolean;
  onSelect?: (id: string) => void;
}> = ({ items, size, square = true, onSelect }) => {
  // TODO(burdon): BUG: React has detected a change in the order of Hooks.
  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });
  const contentRef = useRef<HTMLDivElement>(null);

  const { defaultCellBounds, spacing } = useGrid();
  const { matrix, bounds, cellBounds } = useMemo(() => {
    // Change default cell bounds to screen width if mobile.
    const cellWidth = getCellWidth(defaultCellBounds.width, width ?? 0);
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
  const margin = isNotMobile ? Math.max(cellBounds.width, cellBounds.height) : 0;

  const setCenter = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (item && width && height) {
      const pos = getPosition(item.position!, cellBounds);
      const top = pos.top + margin - (height - cellBounds.height) / 2;
      const left = pos.left + margin - (width - cellBounds.width) / 2;
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
          x: (contentRef.current!.offsetWidth + margin * 2 - width) / 2,
          y: (contentRef.current!.offsetHeight + margin * 2 - height) / 2,
        };

        containerRef.current!.scrollTo({ top: center.y, left: center.x });
      }
    }
  }, [selected, width, height]);

  return (
    <div ref={containerRef} className='grow overflow-auto snap-x snap-mandatory md:snap-none bg-neutral-600'>
      <div ref={contentRef} className='group block relative bg-neutral-500' style={{ ...bounds, margin }}>
        <div className='__group'>
          {matrix.map((row) =>
            row.map(({ x, y }) => (
              <Cell key={`${x}-${y}`} position={{ x, y }} bounds={getBounds({ x, y }, cellBounds, spacing)} />
            )),
          )}
        </div>

        {/* TODO(burdon): onDoubleClick={() => handleSelect(id)} */}
        <div>
          {items.map(({ id, data, position, Component }) => (
            <Wrapper
              key={id}
              id={id}
              data={data}
              position={position}
              Component={Component}
              bounds={getBounds(position ?? { x: 0, y: 0 }, cellBounds, spacing)}
              onSelect={() => handleSelect(id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export type DraggableProps<T> = {
  id: string;
  data: T;
  draggableStyle: any;
  draggableProps: any;
  onSelect?: () => void;
};

type GridItem<T> = {
  id: string;
  data: T;
  position?: Position; // TODO(burdon): Generalize.
  Component: ForwardRefExoticComponent<DraggableProps<T> & RefAttributes<HTMLDivElement> & { onSelect?: () => void }>;
};

const Wrapper: FC<GridItem<any> & { bounds: Bounds; onSelect: () => void }> = ({
  id,
  data,
  Component,
  bounds,
  onSelect,
}) => {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id, data });

  return (
    <Component
      ref={setNodeRef}
      id={id}
      data={data}
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
  // TODO(burdon): Global ids.
  // TODO(burdon): Do we need to use the hook here? (Performance).
  const { setNodeRef, isOver } = useDroppable({ id: `grid-drop-${position.x}-${position.y}`, data: position });

  // TODO(burdon): Create button.
  return (
    <div
      ref={setNodeRef}
      style={{ ...bounds }}
      className='absolute flex justify-center items-center grow select-none cursor-pointer snap-x'
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

export type { GridItem };
