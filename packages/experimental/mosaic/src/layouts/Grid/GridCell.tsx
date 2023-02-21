//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { PlusCircle } from 'phosphor-react';
import React, { ReactNode } from 'react';

import { getSize, mx } from '@dxos/react-components';

import { Box2, Vec2 } from '../../props';
import { serializePosition } from './grid-layout';

export type CellProps = {
  children?: ReactNode;
  position: Vec2;
  box: Box2;
  debug?: boolean;
  onCreate?: (position: Vec2) => void;
};

/**
 * Placeholder (drop target) for Tile.
 */
export const GridCell = ({ children, position, box, debug = true, onCreate }: CellProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: serializePosition(position) });

  const handleClick = (event: any) => {
    if (onCreate) {
      event.stopPropagation();
      onCreate(position);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className='absolute flex flex-1 p-1'
      style={{
        left: `${box.position.x}px`,
        top: `${box.position.y}px`,
        width: `${box.size.x}px`,
        height: `${box.size.y}px`
      }}
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

            {debug && <div className='absolute left-2 bottom-1 text-gray-300'>[{serializePosition(position)}]</div>}
          </>
        )}
      </div>
    </div>
  );
};
