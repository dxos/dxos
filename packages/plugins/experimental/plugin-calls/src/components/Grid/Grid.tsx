//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type PropsWithChildren } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// const ASPECT_RATIO = 16 / 9;
// const MIN_HEIGHT = 200;
// const MIN_WIDTH = MIN_HEIGHT * ASPECT_RATIO;

export type GridProps<T = any> = {
  Cell: ComponentType<GridCellProps>;
  items?: T[];
  expanded?: T;
  debug?: boolean;
  onExpand?: (item?: T) => void;
};

export const Grid = <T = any,>({ Cell, items, expanded, debug, onExpand }: GridProps<T>) => {
  const num = items?.length ?? 0;

  return (
    <div className={mx('flex flex-col py-2 gap-2 w-full h-full overflow-hidden')}>
      {expanded && (
        <div className={mx('flex grow w-full overflow-hidden', num > 0 && 'flex-[60%]')}>
          <Cell expanded item={expanded} onClick={() => onExpand?.()} />
        </div>
      )}

      {num > 0 && (
        <div className='flex flex-[40%] w-full overflow-hidden'>
          <GridColumns Cell={Cell} items={items} debug={debug} onExpand={onExpand} />
        </div>
      )}
    </div>
  );
};

/**
 * Responsive vertically scrolling grid.
 */
const GridColumns = ({ Cell, items, onExpand, ...props }: Omit<GridProps, 'expanded'>) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();

  if (!items?.length) {
    return null;
  }

  if (items?.length === 1) {
    return <Cell {...props} item={items[0]} onClick={() => onExpand?.(items[0])} />;
  }

  const gap = 8;
  const { cols, itemWidth } = calculateOptimalGrid(items?.length ?? 0, { width, height }, gap);

  // TODO(burdon): Scroll if smaller than min size.
  return (
    <div ref={ref} className='w-full flex justify-center items-center'>
      {width && height && (
        <div
          className={mx('grid')}
          style={{
            gridTemplateColumns: `repeat(${cols}, ${itemWidth}px)`,
            gridGap: gap,
          }}
        >
          {items.map((item, i) => (
            <div key={i} className='flex'>
              <Cell {...props} item={item} onClick={() => onExpand?.(item)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export type GridCellProps<T = any> = PropsWithChildren<
  ThemedClassName<{
    item: T;
    name?: string;
    mute?: boolean;
    wave?: boolean;
    speaking?: boolean;
    expanded?: boolean;
    debug?: boolean;
    onClick?: () => void;
  }>
>;

/**
 * Cell container.
 */
export const GridCell = ({ children, classNames, name, mute, wave, speaking, expanded, onClick }: GridCellProps) => {
  const hover = mx('transition-opacity duration-300 opacity-0 group-hover:opacity-100');

  return (
    <GridCellContainer classNames={['group relative', classNames]}>
      {children}

      {/* Action. */}
      {onClick && (
        <div className='z-10 absolute top-1 right-1 flex'>
          <IconButton
            classNames={mx('p-1 min-bs-1 rounded', hover)}
            iconOnly
            icon={expanded ? 'ph--x--regular' : 'ph--arrows-out--regular'}
            size={expanded ? 5 : 3}
            label={expanded ? 'Close' : 'Expand'}
            onClick={onClick}
          />
        </div>
      )}

      {/* Name. */}
      {name && (
        <div className='z-10 absolute bottom-1 right-1 flex gap-1 items-center'>
          {wave && !expanded && (
            <Icon icon='ph--hand-waving--duotone' size={5} classNames='animate-pulse text-red-500' />
          )}
          <div className={mx('bg-neutral-800 text-neutral-100 py-0.5 rounded', expanded ? 'px-2' : 'px-1 text-xs')}>
            {name}
          </div>
        </div>
      )}

      {/* Speaking indicator. */}
      <div className='z-10 absolute bottom-1 left-1 flex'>
        <IconButton
          classNames={mx(
            'p-1 min-bs-1 rounded transition-opacity duration-300 opacity-0',
            (mute || speaking) && 'opacity-100',
            mute && 'bg-orange-500',
          )}
          icon={mute ? 'ph--microphone-slash--regular' : 'ph--waveform--regular'}
          size={expanded ? 5 : 3}
          label={mute ? 'Mute' : ''}
          iconOnly
        />
      </div>
    </GridCellContainer>
  );
};

/**
 * Container centers largest child with aspect ratio.
 */
export const GridCellContainer = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  return (
    <div role='none' className='flex w-full h-full overflow-hidden justify-center items-center'>
      <div role='none' className={mx('flex max-w-full max-h-full aspect-video', classNames)}>
        {children}
      </div>
    </div>
  );
};

type Dimensions = {
  width: number;
  height: number;
};

type GridDimensions = {
  rows: number;
  cols: number;
  itemWidth: number;
  itemHeight: number;
};

/**
 * Calculate the optimal grid dimensions for a given number of items and container dimensions.
 */
const calculateOptimalGrid = (count: number, container: Dimensions, gap = 8, aspectRatio = 16 / 9): GridDimensions => {
  let bestArea = 0;
  let result: GridDimensions = { rows: 1, cols: 1, itemWidth: 0, itemHeight: 0 };

  // Try all possible row counts up to itemCount.
  for (let rows = 1; rows <= count; rows++) {
    const cols = Math.ceil(count / rows);

    // Calculate item dimensions based on container constraints.
    const itemWidth1 = (container.width - (cols - 1) * gap) / cols;
    const itemHeight1 = itemWidth1 / aspectRatio;
    const itemHeight2 = (container.height - (rows - 1) * gap) / rows;
    const itemWidth2 = itemHeight2 * aspectRatio;

    // Check which constraint (width or height) is limiting.
    const useWidth = itemHeight1 * rows <= container.height;
    const itemWidth = useWidth ? itemWidth1 : itemWidth2;
    const itemHeight = useWidth ? itemHeight1 : itemHeight2;

    // Calculate total area covered by items.
    const area = itemWidth * itemHeight * count;
    if (area > bestArea) {
      bestArea = area;
      result = { rows, cols, itemWidth, itemHeight };
    }
  }

  return result;
};
