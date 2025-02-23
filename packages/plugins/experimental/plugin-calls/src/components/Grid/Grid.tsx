//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type PropsWithChildren } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const ASPECT_RATIO = 16 / 9;
const MIN_HEIGHT = 200;
const MIN_WIDTH = MIN_HEIGHT * ASPECT_RATIO;

export type GridProps<T = any> = {
  Cell: ComponentType<GridCellProps>;
  items?: T[];
  expanded?: T;
  debug?: boolean;
  onExpand?: (item?: T) => void;
};

export const Grid = <T = any,>({ Cell, items, expanded, debug, onExpand }: GridProps<T>) => {
  return (
    <div className={mx('flex flex-col py-2 gap-2 w-full h-full overflow-hidden')}>
      {expanded && (
        <div className='flex flex-[50%] w-full overflow-hidden'>
          <Cell expanded item={expanded} onClick={() => onExpand?.()} />
        </div>
      )}

      {items?.length && (
        <div className='flex flex-[50%] w-full overflow-hidden'>
          <GridColumn Cell={Cell} items={items} debug={debug} onExpand={onExpand} />
        </div>
      )}
    </div>
  );
};

/**
 * Responsive vertically scrolling grid.
 */
const GridColumn = ({ Cell, items, onExpand, ...props }: Omit<GridProps, 'expanded'>) => {
  const { ref, width, height = 0 } = useResizeDetector();

  if (items?.length === 1) {
    return <Cell {...props} item={items[0]} onClick={() => onExpand?.(items[0])} />;
  }

  const cellsPerColumn = Math.floor(height / MIN_HEIGHT);
  const maxCols = Math.ceil(items?.length ?? 0 / cellsPerColumn);
  let cols = maxCols;
  for (; cols > 0; cols--) {
    const cellWidth = (width ?? 0) / cols;
    if (cellWidth >= MIN_WIDTH) {
      break;
    }
  }

  const classNames = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3'];
  return (
    <div className='flex'>
      <div ref={ref} className='overflow-y-auto'>
        <div className={mx('grid gap-2', classNames[Math.min(classNames.length, cols) - 1])}>
          {height &&
            items?.map((item, i) => (
              <div key={i} className='flex aspect-video'>
                <Cell {...props} item={item} onClick={() => onExpand?.(item)} />
              </div>
            ))}
        </div>
      </div>
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
    <div className={mx('flex w-full h-full overflow-hidden justify-center items-center', classNames)}>
      <div className='group relative max-w-full max-h-full aspect-video overflow-hidden'>
        {children}

        {/* Action. */}
        {onClick && (
          <div className='z-10 absolute top-1 right-1 flex'>
            <IconButton
              classNames={mx('p-1 min-bs-1 rounded', hover)}
              icon={expanded ? 'ph--x--regular' : 'ph--arrows-out--regular'}
              size={expanded ? 5 : 3}
              onClick={onClick}
              label={expanded ? 'Close' : 'Expand'}
              iconOnly
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
      </div>
    </div>
  );
};
