//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { PlusCircle } from 'phosphor-react';
import React from 'react';

import { getSize, mx } from '@dxos/react-components';

import { Bounds, Point } from './defs';

export const Placeholder = ({ bounds, onCreate }: { bounds: Bounds; onCreate?: (point: Point) => void }) => {
  const { setNodeRef } = useDroppable({ id: `${bounds.point!.x}-${bounds.point!.y}` });

  const handleClick = (event: any) => {
    if (onCreate) {
      event.stopPropagation();
      onCreate(bounds.point!);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className='group flex absolute cursor-pointer border border-gray-300 border-dashed rounded-lg'
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
    >
      <div
        className={mx(
          'relative flex flex-col flex-1 justify-center items-center text-gray-500',
          'transition ease-in-out delay-300 opacity-0 group-hover:opacity-100'
        )}
      >
        <button onClick={handleClick}>
          <PlusCircle className={getSize(8)} />
        </button>
      </div>
      {false && (
        <div className='absolute left-2 bottom-1 text-gray-300'>[{bounds.point?.x + ',' + bounds.point?.y}]</div>
      )}
    </div>
  );
};
