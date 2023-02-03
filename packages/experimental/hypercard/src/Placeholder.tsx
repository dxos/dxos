//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { PlusCircle } from 'phosphor-react';
import React, { ReactNode } from 'react';

import { getSize, mx } from '@dxos/react-components';

import { Bounds, Point, toString } from './defs';

export const Placeholder = ({
  children,
  point,
  bounds,
  debug = true,
  onCreate
}: {
  children?: ReactNode;
  point: Point;
  bounds: Bounds;
  debug?: boolean;
  onCreate?: (point: Point) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: toString(point) });

  const handleClick = (event: any) => {
    if (onCreate) {
      event.stopPropagation();
      onCreate(point);
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
          'group relative flex w-full h-full justify-center items-center __snap-center md:snap-align-none',
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

            {debug && <div className='absolute left-2 bottom-1 text-gray-300'>[{toString(point)}]</div>}
          </>
        )}
      </div>
    </div>
  );
};
