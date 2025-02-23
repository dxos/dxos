//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type PropsWithChildren } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const MIN_HEIGHT = 200;
const MIN_WIDTH = 240;

export type GridProps<T = any> = {
  Cell: ComponentType<GridCellProps>;
  items?: T[];
  expanded?: T;
  debug?: boolean;
  onExpand?: (item?: T) => void;
};

export const Grid = <T = any,>({ Cell, items, expanded, debug, onExpand }: GridProps<T>) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const filteredItems = items?.filter((item) => item !== expanded);
  const singleRow = width >= height;

  return (
    <div ref={ref} className={mx('flex flex-col gap-2 w-full h-full overflow-hidden')}>
      {expanded && (
        <div className={mx('flex grow aspect-video', singleRow && 'overflow-hidden')}>
          <Cell expanded item={expanded} onClick={() => onExpand?.()} />
        </div>
      )}

      {(singleRow && (
        <div className='flex shrink-0 overflow-hidden' style={{ minHeight: MIN_HEIGHT }}>
          <GridRow Cell={Cell} items={filteredItems} debug={debug} onExpand={onExpand} />
        </div>
      )) || (
        <div className='flex grow overflow-hidden'>
          <GridColumn Cell={Cell} items={filteredItems} debug={debug} onExpand={onExpand} />
        </div>
      )}
    </div>
  );
};

/**
 * Single row.
 */
const GridRow = ({ Cell, items, onExpand, ...props }: Omit<GridProps, 'expanded'>) => {
  return (
    <div className='flex gap-2 overflow-x-auto'>
      {items?.map((item, i) => (
        <div key={i} className='aspect-video'>
          <Cell {...props} item={item} onClick={() => onExpand?.(item)} />
        </div>
      ))}
    </div>
  );
};

/**
 * Responsive vertically scrolling grid.
 */
const GridColumn = ({ Cell, items, onExpand, ...props }: Omit<GridProps, 'expanded'>) => {
  const { ref, width, height = 0 } = useResizeDetector();

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
    <div ref={ref} className='flex overflow-y-auto'>
      <div>
        <div className={mx('grid gap-2', classNames[Math.min(classNames.length, cols) - 1])}>
          {height &&
            items?.map((item, i) => (
              <div key={i} className='aspect-video'>
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
    label?: string;
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
export const GridCell = ({ children, classNames, label, mute, wave, speaking, expanded, onClick }: GridCellProps) => {
  const hover = mx('transition-opacity duration-300 opacity-0 group-hover:opacity-100');

  return (
    <div className={mx('flex grow overflow-hidden justify-center items-center', classNames)}>
      <div className='group relative max-w-full max-h-full aspect-video'>
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

        {/* Label. */}
        {label && (
          <div className='z-10 absolute bottom-1 right-1 flex gap-1 items-center'>
            {wave && !expanded && (
              <Icon icon='ph--hand-waving--duotone' size={5} classNames='animate-pulse text-red-500' />
            )}
            <div className={mx('bg-neutral-800 text-neutral-100 py-0.5 rounded', expanded ? 'px-2' : 'px-1 text-xs')}>
              {label}
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
