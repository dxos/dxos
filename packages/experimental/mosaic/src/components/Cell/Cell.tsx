//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { PlusCircle } from '@phosphor-icons/react';
import React, { type ReactNode } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';

import { type Bounds, type Location, type Point, serializeLocation } from '../../layout';

export type CellSlots = {
  showLocation?: boolean;
  root?: {
    className?: string;
  };
  over?: {
    className?: string;
  };
};

export type CellProps = {
  children?: ReactNode;
  location: Location;
  bounds: Bounds;
  slots?: CellSlots;
  onCreate?: (point: Point) => void;
};

/**
 * Placeholder (drop target) for Tile.
 */
export const Cell = ({ children, location, bounds, slots = {}, onCreate }: CellProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: serializeLocation(location) });

  const handleClick = (event: any) => {
    if (onCreate) {
      event.stopPropagation();
      onCreate(location);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className='absolute flex flex-1 p-0.5'
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
    >
      <div
        className={mx(
          'group relative flex w-full h-full justify-center items-center snap-center',
          'rounded-lg cursor-pointer select-none border border-gray-300 border-dashed',
          slots.root?.className,
          isOver && mx('transition ease-in-out duration-500', slots?.over?.className ?? 'bg-gray-200 border-solid'),
        )}
      >
        {children || (
          <>
            {!isOver && (
              <div className={mx('text-gray-500 opacity-10 group-hover:opacity-100')}>
                <button onClick={handleClick}>
                  <PlusCircle className={getSize(8)} />
                </button>
              </div>
            )}

            {slots?.showLocation && (
              <div className='absolute left-2 bottom-1 text-gray-300'>[{serializeLocation(location)}]</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
