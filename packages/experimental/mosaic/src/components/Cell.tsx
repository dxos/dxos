//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { PlusCircle } from 'phosphor-react';
import React, { ReactNode } from 'react';

import { getSize, mx } from '@dxos/react-components';

import { Bounds, Location, Point, serializeLocation } from '../layout';

export type CellProps = {
  children?: ReactNode;
  location: Location;
  bounds: Bounds;
  debug?: boolean;
  onCreate?: (point: Point) => void;
};

/**
 * Placeholder (drop target) for Tile.
 */
export const Cell = ({ children, location, bounds, debug = true, onCreate }: CellProps) => {
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
      className='absolute flex flex-1 p-1'
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
    >
      <div
        className={mx(
          'group relative flex w-full h-full justify-center items-center snap-center',
          'rounded-lg cursor-pointer select-none',
          isOver ? 'transition ease-in-out duration-500 bg-gray-300' : 'border border-gray-300 border-dashed'
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

            {debug && <div className='absolute left-2 bottom-1 text-gray-300'>[{serializeLocation(location)}]</div>}
          </>
        )}
      </div>
    </div>
  );
};
